import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const escapeHtml = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

function emailHtml(opts: { signerName: string; title: string; message?: string | null; url: string; brokerName: string }) {
  const { signerName, title, message, url, brokerName } = opts;
  return `<!DOCTYPE html><html><body style="margin:0;background:#f5f5f5;font-family:'Poppins',-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="padding:32px 40px 24px;text-align:center;border-bottom:3px solid #e63946;">
      <h1 style="margin:0;font-size:22px;color:#1a1a1a;">Document ready to sign</h1>
    </div>
    <div style="padding:32px 40px;">
      <p style="font-size:17px;font-weight:600;margin:0 0 16px;">Hi ${escapeHtml(signerName)},</p>
      <p style="font-size:15px;line-height:1.6;color:#4a4a4a;margin:0 0 16px;">
        ${message ? escapeHtml(message).replace(/\n/g, "<br>") : `${escapeHtml(brokerName)} has sent you a document to review and sign electronically.`}
      </p>
      <div style="background:#fafafa;border:1px solid #eee;border-radius:8px;padding:16px 20px;margin:24px 0;">
        <p style="margin:0;font-size:15px;font-weight:600;color:#1a1a1a;">${escapeHtml(title)}</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 40px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">Review &amp; sign</a>
      </div>
      <p style="font-size:12px;color:#999;line-height:1.6;">This link is unique to you — please don't forward it. Your signature, along with the date, time and IP address, is recorded for the audit trail.</p>
    </div>
    <div style="padding:24px 40px;text-align:center;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#999;margin:4px 0;">${escapeHtml(brokerName)}</p>
    </div>
  </div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const documentId = body.document_id;
    const appUrl = typeof body.app_url === "string" && /^https?:\/\//.test(body.app_url)
      ? body.app_url.replace(/\/+$/, "")
      : "https://connect.margin.com.au";
    if (!isUuid(documentId)) return json({ error: "Invalid document id" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: doc } = await admin
      .from("esign_documents")
      .select("id, title, message, status, broker_id")
      .eq("id", documentId)
      .maybeSingle();
    if (!doc) return json({ error: "Document not found" }, 404);

    // Authorisation: broker owner, their staff, or super admin
    const { data: brokerId } = await admin.rpc("get_my_broker_id", { _user_id: user.id });
    const { data: isSuper } = await admin.rpc("is_super_admin", { _user_id: user.id });
    if (!isSuper && brokerId !== doc.broker_id) return json({ error: "Not authorized" }, 403);

    const { data: signers } = await admin
      .from("esign_signers")
      .select("id, name, email, token, status, signing_order")
      .eq("document_id", documentId)
      .order("signing_order", { ascending: true });

    if (!signers || signers.length === 0) return json({ error: "No signers on this document" }, 400);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", doc.broker_id)
      .maybeSingle();
    const brokerName = profile?.company_name || profile?.full_name || "Your broker";

    const pending = signers.filter((s) => s.status === "pending" || s.status === "sent" || s.status === "viewed");
    // Sequential signing: only notify the lowest outstanding order group
    const nextOrder = pending.length ? Math.min(...pending.map((s) => s.signing_order)) : null;
    const targets = pending.filter((s) => s.signing_order === nextOrder);

    let sent = 0;
    for (const signer of targets) {
      const url = `${appUrl}/sign/${signer.token}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Margin Finance <notifications@margin.com.au>",
          to: [signer.email],
          subject: `Please sign: ${doc.title}`,
          html: emailHtml({ signerName: signer.name, title: doc.title, message: doc.message, url, brokerName }),
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("Resend error", t);
        continue;
      }
      sent++;
      await admin.from("esign_signers").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", signer.id);
      await admin.from("esign_events").insert({
        document_id: documentId,
        signer_id: signer.id,
        event_type: "sent",
        detail: `Signing link emailed to ${signer.email}`,
      });
    }

    if (sent > 0 && doc.status !== "completed") {
      await admin
        .from("esign_documents")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", documentId);
    }

    return json({ success: true, sent });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
