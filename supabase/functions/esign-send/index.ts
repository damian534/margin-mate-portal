import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

import { sendSigningInvitations } from "../_shared/esignInvitations.ts";

const isUuid = (v: unknown) =>
  typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) return json({ error: "Signing email is not configured" }, 500);

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

    if (["voided", "completed"].includes(doc.status)) return json({ error: "This document is no longer awaiting signatures" }, 400);
    if (body.action === "add_signers") {
      const additions = Array.isArray(body.signers) ? body.signers : [];
      if (!additions.length || additions.length > 20) return json({ error: "Add between 1 and 20 signers" }, 400);
      const cleaned: { name: string; email: string }[] = [];
      for (const entry of additions) {
        if (!entry || typeof entry.name !== "string" || typeof entry.email !== "string") return json({ error: "Every signer needs a name and email" }, 400);
        const name = entry.name.trim();
        const email = entry.email.trim().toLowerCase();
        if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Every signer needs a valid name and email" }, 400);
        cleaned.push({ name, email });
      }
      const { data: existing, error: existingError } = await admin.from("esign_signers").select("name, email, signing_order").eq("document_id", documentId);
      if (existingError) throw existingError;
      const identities = new Set((existing || []).map(s => `${s.name.trim().toLowerCase()}|${s.email.trim().toLowerCase()}`));
      const unique = cleaned.filter(s => {
        const key = `${s.name.toLowerCase()}|${s.email}`;
        if (identities.has(key)) return false;
        identities.add(key);
        return true;
      });
      // Repeated submissions reconcile existing parties instead of adding duplicate signing links.
      if (unique.length) {
        const lastOrder = Math.max(0, ...(existing || []).map(s => s.signing_order));
        const { error: insertError } = await admin.from("esign_signers").insert(unique.map((s, i) => ({ ...s, document_id: documentId, signing_order: lastOrder + i + 1, token: (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "") })));
        if (insertError) throw insertError;
      }
    }
    const result = await sendSigningInvitations(admin, documentId, RESEND_API_KEY, body.action === "resend");
    if (result.failed) return json({ error: "Some signing invitations could not be sent", ...result }, 502);
    return json({ success: true, sent: result.sent });
  } catch (err) {
    console.error(err);
    return json({ error: (err as Error).message }, 500);
  }
});
