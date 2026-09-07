import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const url = new URL(req.url);
    const token = (url.searchParams.get("token") || "").trim();
    if (!token || token.length < 20 || token.length > 128) return json({ error: "Invalid link" }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: signer } = await admin
      .from("esign_signers")
      .select("id, name, email, status, signing_order, signed_at, document_id")
      .eq("token", token)
      .maybeSingle();
    if (!signer) return json({ error: "This signing link is invalid or has been withdrawn." }, 404);

    const { data: doc } = await admin
      .from("esign_documents")
      .select("id, title, message, status, file_path, file_name, broker_id")
      .eq("id", signer.document_id)
      .maybeSingle();
    if (!doc) return json({ error: "This document is no longer available." }, 404);
    if (doc.status === "voided") return json({ error: "This document has been withdrawn." }, 403);

    // Sequential signing — wait your turn
    const { data: others } = await admin
      .from("esign_signers")
      .select("id, name, status, signing_order")
      .eq("document_id", doc.id)
      .order("signing_order", { ascending: true });

    const waitingOn = (others || []).filter(
      (s) => s.signing_order < signer.signing_order && s.status !== "signed" && s.status !== "declined",
    );

    const { data: signed } = await admin.storage.from("esign-documents").createSignedUrl(doc.file_path, 60 * 30);

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, company_name")
      .eq("user_id", doc.broker_id)
      .maybeSingle();

    if (signer.status === "sent" || signer.status === "pending") {
      await admin
        .from("esign_signers")
        .update({ status: "viewed", viewed_at: new Date().toISOString() })
        .eq("id", signer.id);
      await admin.from("esign_events").insert({
        document_id: doc.id,
        signer_id: signer.id,
        event_type: "viewed",
        detail: "Document opened",
        ip_address: req.headers.get("x-forwarded-for") || null,
        user_agent: req.headers.get("user-agent") || null,
      });
    }

    return json({
      document: {
        id: doc.id,
        title: doc.title,
        message: doc.message,
        status: doc.status,
        file_name: doc.file_name,
        file_url: signed?.signedUrl || null,
      },
      signer: {
        name: signer.name,
        email: signer.email,
        status: signer.status,
        signed_at: signer.signed_at,
      },
      waiting_on: waitingOn.map((s) => s.name),
      sender: profile?.company_name || profile?.full_name || "Your broker",
    });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
