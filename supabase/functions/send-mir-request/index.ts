import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendMirRequest {
  lead_id: string;
  app_url: string;
  document_names: string[];
  recipient_email: string;
  recipient_name?: string;
  lender?: string;
  message?: string;
  from_email: string;
  from_name?: string;
  reply_to?: string;
}

const ALLOWED_FROM_DOMAINS = ["margin.com.au"];
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
const cleanText = (value: unknown, fallback = "") => String(value || fallback).replace(/[<>]/g, "").trim().slice(0, 200);
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildMirEmailHtml(opts: {
  clientName: string;
  portalUrl: string;
  brokerName: string;
  fromName: string;
  lender?: string;
  message?: string;
  documents: string[];
}) {
  const { clientName, portalUrl, brokerName, fromName, lender, message, documents } = opts;
  const messageHtml = message
    ? `<p class="body-text" style="white-space:pre-wrap;">${escapeHtml(message)}</p>`
    : `<p class="body-text">The bank has come back to us requesting a few extra documents to progress your application. Could you please upload the items listed below as soon as possible so we can keep things moving?</p>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f5f5f5; font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .container { max-width:600px; margin:0 auto; background:#fff; }
  .header { padding:32px 40px 24px; text-align:center; border-bottom:3px solid #e63946; }
  .header h1 { margin:0; font-size:24px; font-weight:700; color:#1a1a1a; }
  .mir-badge { display:inline-block; background:#fff3e0; color:#b45309; border:1px solid #fed7aa; padding:4px 10px; border-radius:999px; font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; margin-top:10px; }
  .body-content { padding:32px 40px; }
  .greeting { font-size:18px; font-weight:600; color:#1a1a1a; margin:0 0 16px; }
  .body-text { font-size:15px; line-height:1.6; color:#4a4a4a; margin:0 0 16px; }
  .doc-section { background:#fafafa; border-radius:8px; padding:20px 24px; margin:24px 0; border:1px solid #eee; }
  .doc-section h3 { margin:0 0 12px; font-size:15px; font-weight:600; color:#1a1a1a; }
  .doc-list { margin:0; padding:0 0 0 20px; }
  .doc-list li { font-size:14px; line-height:1.8; color:#4a4a4a; }
  .cta-container { text-align:center; margin:32px 0; }
  .cta-btn { display:inline-block; background:#1a1a1a; color:#fff !important; padding:14px 40px; border-radius:8px; text-decoration:none; font-size:16px; font-weight:600; }
  .footer { padding:24px 40px; text-align:center; border-top:1px solid #eee; }
  .footer p { font-size:12px; color:#999; margin:4px 0; }
</style></head>
<body><div class="container">
  <div class="header">
    <h1>Margin Connect</h1>
    <div class="mir-badge">Lender Document Request${lender ? ` · ${escapeHtml(lender)}` : ""}</div>
  </div>
  <div class="body-content">
    <p class="greeting">Hi ${escapeHtml(clientName)},</p>
    ${messageHtml}
    <div class="doc-section">
      <h3>Documents requested</h3>
      <ul class="doc-list">
        ${documents.map(d => `<li>${escapeHtml(d)}</li>`).join("")}
      </ul>
    </div>
    <div class="cta-container">
      <a class="cta-btn" href="${portalUrl}">Upload Documents</a>
    </div>
    <p class="body-text">If you have any questions, just reply to this email and ${escapeHtml(fromName || brokerName || "your broker")} will get back to you.</p>
  </div>
  <div class="footer">
    <p>Margin Finance — Making every connection count</p>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData } = await supabaseUser.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = (await req.json()) as SendMirRequest;
    const { lead_id, app_url, document_names, recipient_email, recipient_name, lender, message, from_email, from_name, reply_to } = body;

    if (!lead_id || !app_url || !Array.isArray(document_names) || document_names.length === 0 || !recipient_email || !from_email) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isValidEmail(recipient_email)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isValidEmail(from_email)) {
      return new Response(JSON.stringify({ error: "Invalid sender email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fromDomain = from_email.split("@")[1]?.toLowerCase() || "";
    const fromAllowed = ALLOWED_FROM_DOMAINS.includes(fromDomain);

    const { data: lead } = await supabaseAdmin
      .from("leads")
      .select("id, first_name, last_name, broker_id")
      .eq("id", lead_id)
      .maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Reuse / create portal token
    const { data: existingToken } = await supabaseAdmin
      .from("client_portal_tokens").select("token").eq("lead_id", lead_id).eq("is_active", true).maybeSingle();
    let portalToken = existingToken?.token as string | undefined;
    if (!portalToken) {
      const { data: newToken, error: tokenErr } = await supabaseAdmin
        .from("client_portal_tokens").insert({ lead_id, created_by: claimsData.claims.sub, is_active: true })
        .select("token").maybeSingle();
      if (tokenErr || !newToken) {
        return new Response(JSON.stringify({ error: "Failed to create portal token" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      portalToken = (newToken as any).token;
    }

    let brokerName = "";
    if (lead.broker_id) {
      const { data: brokerProfile } = await supabaseAdmin.from("profiles").select("full_name").eq("user_id", lead.broker_id).maybeSingle();
      brokerName = (brokerProfile as any)?.full_name || "";
    }

    const portalUrl = `${app_url.replace(/\/$/, "")}/client-portal/${encodeURIComponent(portalToken!)}?view=documents`;
    const clientName = cleanText(recipient_name, `${lead.first_name} ${lead.last_name || ""}`.trim());
    const cleanedDocs = document_names.map(d => cleanText(d, "Requested document"));
    const cleanLender = lender ? cleanText(lender) : undefined;
    const cleanMessage = message ? String(message).slice(0, 4000) : undefined;
    const cleanFromName = cleanText(from_name, brokerName || "Margin Finance");

    const html = buildMirEmailHtml({
      clientName, portalUrl, brokerName, fromName: cleanFromName,
      lender: cleanLender, message: cleanMessage, documents: cleanedDocs,
    });
    const subject = `${clientName} — Additional documents requested${cleanLender ? ` (${cleanLender})` : ""}`;

    // Always send through verified margin.com.au domain. Use the chosen address only if it's allowed; otherwise put it in reply-to.
    const senderAddress = fromAllowed ? from_email : "notifications@margin.com.au";
    const senderDisplay = cleanFromName ? `${cleanFromName} <${senderAddress}>` : `Margin Finance <${senderAddress}>`;
    const replyToFinal = reply_to || (fromAllowed ? from_email : from_email);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: senderDisplay,
        to: [recipient_email],
        reply_to: replyToFinal,
        subject,
        html,
      }),
    });
    const emailData = await emailRes.json();
    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, email_id: emailData.id, portal_url: portalUrl }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-mir-request error:", error);
    return new Response(JSON.stringify({ error: error.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});