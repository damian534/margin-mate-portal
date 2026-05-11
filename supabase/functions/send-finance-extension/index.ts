import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED_FROM_DOMAINS = ["margin.com.au"];
const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 255;
const cleanText = (v: unknown, fallback = "") => String(v || fallback).replace(/[<>]/g, "").trim().slice(0, 200);
const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Body {
  lead_id: string;
  recipient_email: string;
  recipient_name?: string;
  recipient_role?: string;
  recipient_contact_id?: string | null;
  current_due_date?: string | null;
  requested_days: number;
  proposed_new_date?: string | null;
  message?: string;
  from_email: string;
  from_name?: string;
  reply_to?: string;
  cc?: string[];
}

function buildHtml(o: {
  greetingName: string; clientName: string; brokerName: string; fromName: string;
  currentDate?: string | null; days: number; proposed?: string | null; message?: string;
}) {
  const { greetingName, clientName, brokerName, fromName, currentDate, days, proposed, message } = o;
  const messageHtml = message
    ? `<p class="body-text" style="white-space:pre-wrap;">${escapeHtml(message)}</p>`
    : `<p class="body-text">We'd like to formally request an extension of the finance clause for the matter referenced below. Could you please confirm that an extension can be arranged with the vendor's representative?</p>`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}
  .container{max-width:600px;margin:0 auto;background:#fff;}
  .header{padding:32px 40px 24px;text-align:center;border-bottom:3px solid #e63946;}
  .header h1{margin:0;font-size:24px;font-weight:700;color:#1a1a1a;}
  .badge{display:inline-block;background:#fff3e0;color:#b45309;border:1px solid #fed7aa;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-top:10px;}
  .body-content{padding:32px 40px;}
  .greeting{font-size:18px;font-weight:600;color:#1a1a1a;margin:0 0 16px;}
  .body-text{font-size:15px;line-height:1.6;color:#4a4a4a;margin:0 0 16px;}
  .panel{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:18px 22px;margin:20px 0;}
  .row{display:flex;justify-content:space-between;font-size:14px;color:#1a1a1a;padding:6px 0;border-bottom:1px dashed #e5e5e5;}
  .row:last-child{border-bottom:none;}
  .row span:first-child{color:#6b7280;}
  .footer{padding:24px 40px;text-align:center;border-top:1px solid #eee;}
  .footer p{font-size:12px;color:#999;margin:4px 0;}
</style></head>
<body><div class="container">
  <div class="header">
    <h1>Margin Connect</h1>
    <div class="badge">Finance Extension Request</div>
  </div>
  <div class="body-content">
    <p class="greeting">Hi ${escapeHtml(greetingName)},</p>
    ${messageHtml}
    <div class="panel">
      <div class="row"><span>Client</span><span>${escapeHtml(clientName)}</span></div>
      ${currentDate ? `<div class="row"><span>Current finance due</span><span>${escapeHtml(currentDate)}</span></div>` : ""}
      <div class="row"><span>Extension requested</span><span>${days} day${days === 1 ? "" : "s"}</span></div>
      ${proposed ? `<div class="row"><span>Proposed new date</span><span>${escapeHtml(proposed)}</span></div>` : ""}
    </div>
    <p class="body-text">Please let us know once this has been confirmed, or if you require anything further from our end.</p>
    <p class="body-text">Kind regards,<br>${escapeHtml(fromName || brokerName || "Margin Finance")}</p>
  </div>
  <div class="footer">
    <p>Margin Finance — Making every connection count</p>
  </div>
</div></body></html>`;
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
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

    const body = (await req.json()) as Body;
    const { lead_id, recipient_email, recipient_name, recipient_role, recipient_contact_id,
      current_due_date, requested_days, proposed_new_date, message,
      from_email, from_name, reply_to, cc } = body;

    if (!lead_id || !recipient_email || !from_email || !requested_days || requested_days < 1 || requested_days > 365) {
      return new Response(JSON.stringify({ error: "Missing or invalid fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!isValidEmail(recipient_email) || !isValidEmail(from_email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fromDomain = from_email.split("@")[1]?.toLowerCase() || "";
    const fromAllowed = ALLOWED_FROM_DOMAINS.includes(fromDomain);

    const { data: lead } = await supabaseAdmin
      .from("leads").select("id, first_name, last_name, broker_id, opportunity_name").eq("id", lead_id).maybeSingle();
    if (!lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let brokerName = "";
    if (lead.broker_id) {
      const { data: bp } = await supabaseAdmin.from("profiles").select("full_name").eq("user_id", lead.broker_id).maybeSingle();
      brokerName = (bp as any)?.full_name || "";
    }

    const clientName = `${lead.first_name} ${lead.last_name || ""}`.trim();
    const cleanFromName = cleanText(from_name, brokerName || "Margin Finance");
    const greetingName = cleanText(recipient_name?.split(" ")[0], "there");
    const subject = `Finance extension request — ${clientName}${(lead as any).opportunity_name ? ` (${(lead as any).opportunity_name})` : ""}`;

    const html = buildHtml({
      greetingName,
      clientName,
      brokerName,
      fromName: cleanFromName,
      currentDate: fmtDate(current_due_date),
      days: requested_days,
      proposed: fmtDate(proposed_new_date),
      message: message ? String(message).slice(0, 4000) : undefined,
    });

    const senderAddress = fromAllowed ? from_email : "notifications@margin.com.au";
    const senderDisplay = cleanFromName ? `${cleanFromName} <${senderAddress}>` : `Margin Finance <${senderAddress}>`;
    const replyToFinal = reply_to || from_email;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: senderDisplay,
        to: [recipient_email],
        cc: Array.isArray(cc) && cc.length ? cc.filter(isValidEmail) : undefined,
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

    await supabaseAdmin.from("lead_finance_extensions").insert({
      lead_id,
      requested_by: claimsData.claims.sub,
      recipient_contact_id: recipient_contact_id || null,
      recipient_email,
      recipient_name: recipient_name || null,
      recipient_role: recipient_role || null,
      previous_due_date: current_due_date || null,
      requested_days,
      proposed_new_date: proposed_new_date || null,
      message: message || null,
      status: "sent",
      resend_id: emailData.id || null,
    } as any);

    return new Response(JSON.stringify({ success: true, email_id: emailData.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-finance-extension error:", e);
    return new Response(JSON.stringify({ error: e.message || "Server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});