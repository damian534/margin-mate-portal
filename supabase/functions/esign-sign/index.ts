import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!m) return null;
  const bin = atob(m[1].replace(/\s/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const signatureDataUrl = String(body.signature || "");
    const typedName = String(body.typed_name || "").trim().slice(0, 120);
    const signatureType = body.signature_type === "typed" ? "typed" : "drawn";

    if (!token || token.length < 20 || token.length > 128) return json({ error: "Invalid link" }, 400);
    if (!typedName) return json({ error: "Please enter your full name" }, 400);
    const sigBytes = dataUrlToBytes(signatureDataUrl);
    if (!sigBytes || sigBytes.length > 2 * 1024 * 1024) return json({ error: "Invalid signature image" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const ip = req.headers.get("x-forwarded-for") || null;
    const ua = req.headers.get("user-agent") || null;

    const { data: signer } = await admin
      .from("esign_signers")
      .select("id, name, email, status, signing_order, document_id")
      .eq("token", token)
      .maybeSingle();
    if (!signer) return json({ error: "This signing link is invalid." }, 404);
    if (signer.status === "signed") return json({ error: "You have already signed this document." }, 400);

    const { data: doc } = await admin
      .from("esign_documents")
      .select("id, title, file_path, file_name, broker_id, status, lead_id")
      .eq("id", signer.document_id)
      .maybeSingle();
    if (!doc || doc.status === "voided") return json({ error: "This document is no longer available." }, 403);

    const { data: allSigners } = await admin
      .from("esign_signers")
      .select("id, name, email, status, signing_order, signed_at, signature_path, typed_name, ip_address")
      .eq("document_id", doc.id)
      .order("signing_order", { ascending: true });

    const blocking = (allSigners || []).filter(
      (s) => s.signing_order < signer.signing_order && s.status !== "signed" && s.status !== "declined",
    );
    if (blocking.length) return json({ error: "Another signer needs to sign before you." }, 400);

    const sigPath = `${doc.broker_id}/${doc.id}/signatures/${signer.id}.png`;
    const { error: upErr } = await admin.storage
      .from("esign-documents")
      .upload(sigPath, sigBytes, { contentType: "image/png", upsert: true });
    if (upErr) return json({ error: "Could not save signature" }, 500);

    const signedAt = new Date().toISOString();
    await admin
      .from("esign_signers")
      .update({
        status: "signed",
        signed_at: signedAt,
        signature_path: sigPath,
        signature_type: signatureType,
        typed_name: typedName,
        ip_address: ip,
        user_agent: ua,
      })
      .eq("id", signer.id);

    await admin.from("esign_events").insert({
      document_id: doc.id,
      signer_id: signer.id,
      event_type: "signed",
      detail: `Signed by ${typedName}`,
      ip_address: ip,
      user_agent: ua,
    });

    const refreshed = (allSigners || []).map((s) =>
      s.id === signer.id
        ? { ...s, status: "signed", signed_at: signedAt, signature_path: sigPath, typed_name: typedName, ip_address: ip }
        : s,
    );
    const outstanding = refreshed.filter((s) => s.status !== "signed" && s.status !== "declined");

    if (outstanding.length === 0) {
      // Build the completed pack: original document + signature certificate page
      let signedPath: string | null = null;
      try {
        const { data: original } = await admin.storage.from("esign-documents").download(doc.file_path);
        const originalBytes = original ? new Uint8Array(await original.arrayBuffer()) : null;

        let pdf: PDFDocument;
        if (originalBytes && doc.file_name.toLowerCase().endsWith(".pdf")) {
          pdf = await PDFDocument.load(originalBytes, { ignoreEncryption: true });
        } else {
          pdf = await PDFDocument.create();
        }

        const font = await pdf.embedFont(StandardFonts.Helvetica);
        const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
        const page = pdf.addPage([595, 842]);
        let y = 780;
        page.drawText("Certificate of Electronic Signature", { x: 48, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
        y -= 26;
        page.drawText(doc.title.slice(0, 90), { x: 48, y, size: 12, font, color: rgb(0.35, 0.35, 0.35) });
        y -= 30;
        page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        y -= 30;

        for (const s of refreshed) {
          if (s.status !== "signed") continue;
          page.drawText(s.name, { x: 48, y, size: 12, font: bold });
          y -= 16;
          page.drawText(`${s.email}`, { x: 48, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
          y -= 14;
          page.drawText(`Signed ${new Date(s.signed_at as string).toUTCString()}`, {
            x: 48, y, size: 10, font, color: rgb(0.4, 0.4, 0.4),
          });
          y -= 14;
          page.drawText(`IP address: ${s.ip_address || "unknown"}`, { x: 48, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
          y -= 10;

          if (s.signature_path) {
            const { data: sigFile } = await admin.storage.from("esign-documents").download(s.signature_path);
            if (sigFile) {
              const png = await pdf.embedPng(new Uint8Array(await sigFile.arrayBuffer()));
              const scale = Math.min(180 / png.width, 60 / png.height);
              y -= png.height * scale;
              page.drawImage(png, { x: 48, y, width: png.width * scale, height: png.height * scale });
            }
          }
          y -= 28;
          page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
          y -= 24;
          if (y < 120) y = 780;
        }

        const bytes = await pdf.save();
        signedPath = `${doc.broker_id}/${doc.id}/signed-${doc.file_name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        if (!signedPath.toLowerCase().endsWith(".pdf")) signedPath += ".pdf";
        await admin.storage.from("esign-documents").upload(signedPath, bytes, {
          contentType: "application/pdf",
          upsert: true,
        });
      } catch (e) {
        console.error("Certificate build failed", e);
      }

      await admin
        .from("esign_documents")
        .update({ status: "completed", completed_at: signedAt, signed_file_path: signedPath })
        .eq("id", doc.id);

      await admin.from("esign_events").insert({
        document_id: doc.id,
        event_type: "completed",
        detail: "All signers completed",
      });

      if (doc.lead_id) {
        await admin.from("notes").insert({
          lead_id: doc.lead_id,
          content: `✍️ Document signed: ${doc.title} — all signers completed`,
        });
      }

      // Notify the broker
      const { data: profile } = await admin
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", doc.broker_id)
        .maybeSingle();
      if (profile?.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Margin Finance <notifications@margin.com.au>",
            to: [profile.email],
            subject: `Signed: ${doc.title}`,
            html: `<p>All signers have completed <strong>${escapeHtml(doc.title)}</strong>.</p>
                   <p>The signed copy and audit trail are available in Connect.</p>`,
          }),
        }).catch((e) => console.error("broker notify failed", e));
      }
    }

    return json({ success: true, completed: outstanding.length === 0 });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
