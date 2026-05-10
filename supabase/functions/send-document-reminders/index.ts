import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Smart taper: days since the first outstanding doc was requested.
const REMINDER_DAYS = [2, 4, 7, 11, 16, 22, 30] as const;

// Lead statuses that stop reminders.
const STOPPED_LEAD_STATUSES = new Set(["lost", "withdrawn", "declined"]);

// App URL used in email links.
const APP_URL = (Deno.env.get("PUBLIC_APP_URL") || "https://connect.margin.com.au").replace(/\/$/, "");

const cleanText = (value: unknown, fallback = "") =>
  String(value || fallback).replace(/[<>]/g, "").trim().slice(0, 120);
const isValidEmail = (email: string) =>
  typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;

function buildReminderHtml(opts: {
  clientName: string;
  brokerName: string;
  portalUrl: string;
  unsubscribeUrl: string;
  outstandingDocs: string[];
  dayOffset: number;
}): string {
  const { clientName, brokerName, portalUrl, unsubscribeUrl, outstandingDocs, dayOffset } = opts;
  const docList = outstandingDocs.length
    ? outstandingDocs.map(n => `<li>${n.replace(/</g, "&lt;")}</li>`).join("")
    : "<li>Please open the portal to see what's still outstanding.</li>";

  const intro = dayOffset <= 4
    ? "Just a quick reminder — we're still waiting on a few documents to keep your application moving."
    : dayOffset <= 11
      ? "We're still missing some documents needed to progress your application."
      : "Your application is on hold until we receive the outstanding documents listed below.";

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; padding:0; background:#f5f5f5; font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .container { max-width:600px; margin:0 auto; background:#ffffff; }
  .header { padding:32px 40px 24px; text-align:center; border-bottom:3px solid #e63946; }
  .header h1 { margin:0; font-size:24px; font-weight:700; color:#1a1a1a; }
  .body-content { padding:32px 40px; }
  .greeting { font-size:18px; font-weight:600; color:#1a1a1a; margin:0 0 16px; }
  .body-text { font-size:15px; line-height:1.6; color:#4a4a4a; margin:0 0 16px; }
  .cta-container { text-align:center; margin:32px 0; }
  .cta-btn { display:inline-block; background:#e63946; color:#fff !important; padding:14px 40px; border-radius:8px; text-decoration:none; font-size:16px; font-weight:600; }
  .doc-section { background:#fafafa; border-radius:8px; padding:20px 24px; margin:24px 0; border:1px solid #eee; }
  .doc-section h3 { margin:0 0 12px; font-size:15px; font-weight:600; color:#1a1a1a; }
  .doc-list { margin:0; padding:0 0 0 20px; }
  .doc-list li { font-size:14px; line-height:1.8; color:#4a4a4a; }
  .footer { padding:24px 40px; text-align:center; border-top:1px solid #eee; }
  .footer p { font-size:12px; color:#999; margin:4px 0; }
  .footer a { color:#999; }
</style></head>
<body><div class="container">
  <div class="header"><h1><span style="color:#e63946;">M</span>argin <span style="color:#e63946;">Connect</span></h1></div>
  <div class="body-content">
    <p class="greeting">Hi ${clientName},</p>
    <p class="body-text">${intro}</p>
    <div class="cta-container"><a href="${portalUrl}" class="cta-btn">Upload My Documents</a></div>
    <div class="doc-section"><h3>📄 Still outstanding:</h3><ul class="doc-list">${docList}</ul></div>
    <p class="body-text">If you've already sent these through another channel, just reply to this email and let ${brokerName || "your broker"} know — we'll mark them off.</p>
  </div>
  <div class="footer">
    <p>Margin Finance — Making every connection count</p>
    <p>You're receiving this because documents were requested for your application.</p>
    <p><a href="${unsubscribeUrl}">Stop these reminders</a></p>
  </div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const summary = { scanned: 0, sent: 0, skipped: 0, errors: 0 as number, details: [] as any[] };

  try {
    // Pull all pending document requests grouped by lead
    const { data: pending, error: pendingErr } = await admin
      .from("document_requests")
      .select("lead_id, name, status, requested_at")
      .eq("status", "pending")
      .not("requested_at", "is", null);

    if (pendingErr) throw pendingErr;

    const byLead = new Map<string, { earliest: Date; names: string[] }>();
    for (const row of pending || []) {
      if (!row.lead_id || !row.requested_at) continue;
      const reqAt = new Date(row.requested_at);
      const cur = byLead.get(row.lead_id);
      if (!cur) byLead.set(row.lead_id, { earliest: reqAt, names: [row.name] });
      else {
        if (reqAt < cur.earliest) cur.earliest = reqAt;
        cur.names.push(row.name);
      }
    }

    summary.scanned = byLead.size;
    if (byLead.size === 0) {
      return new Response(JSON.stringify({ ok: true, ...summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leadIds = Array.from(byLead.keys());
    const { data: leads, error: leadsErr } = await admin
      .from("leads")
      .select("id, first_name, last_name, email, broker_id, status, wip_status, doc_reminders_paused, co_applicant_contact_id")
      .in("id", leadIds);
    if (leadsErr) throw leadsErr;

    // Co-applicant contacts + lead applicants
    const coContactIds = (leads || []).map(l => l.co_applicant_contact_id).filter(Boolean) as string[];
    const { data: coContacts } = coContactIds.length
      ? await admin.from("contacts").select("id, first_name, last_name, email, email_opt_out").in("id", coContactIds)
      : { data: [] as any[] };
    const coById = new Map((coContacts || []).map(c => [c.id, c]));

    const { data: applicants } = await admin
      .from("lead_applicants")
      .select("lead_id, name, email")
      .in("lead_id", leadIds);
    const applicantsByLead = new Map<string, { name: string; email: string | null }[]>();
    for (const a of applicants || []) {
      if (!applicantsByLead.has(a.lead_id)) applicantsByLead.set(a.lead_id, []);
      applicantsByLead.get(a.lead_id)!.push({ name: a.name, email: a.email });
    }

    // Active portal token per lead
    const { data: tokens } = await admin
      .from("client_portal_tokens")
      .select("lead_id, token, is_active")
      .in("lead_id", leadIds)
      .eq("is_active", true);
    const tokenByLead = new Map((tokens || []).map(t => [t.lead_id, t.token]));

    // Existing send log (so we don't double-send for the same day_offset)
    const { data: pastSends } = await admin
      .from("document_reminder_sends")
      .select("lead_id, recipient_email, day_offset")
      .in("lead_id", leadIds);
    const sentKeys = new Set(
      (pastSends || []).map(s => `${s.lead_id}::${(s.recipient_email || "").toLowerCase()}::${s.day_offset}`),
    );

    // Broker names
    const brokerIds = Array.from(new Set((leads || []).map(l => l.broker_id).filter(Boolean))) as string[];
    const { data: brokerProfiles } = brokerIds.length
      ? await admin.from("profiles").select("user_id, full_name").in("user_id", brokerIds)
      : { data: [] as any[] };
    const brokerNameById = new Map((brokerProfiles || []).map(p => [p.user_id, p.full_name || ""]));

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (const lead of leads || []) {
      const meta = byLead.get(lead.id);
      if (!meta) continue;

      // Stop rules
      if (lead.doc_reminders_paused) { summary.skipped++; continue; }
      if (lead.wip_status === "settled") { summary.skipped++; continue; }
      if (lead.status && STOPPED_LEAD_STATUSES.has(String(lead.status).toLowerCase())) { summary.skipped++; continue; }

      // Day offset (whole days since first request, UTC date math)
      const earliest = new Date(meta.earliest);
      earliest.setUTCHours(0, 0, 0, 0);
      const dayOffset = Math.floor((today.getTime() - earliest.getTime()) / 86400000);
      if (!REMINDER_DAYS.includes(dayOffset as any)) { summary.skipped++; continue; }

      const portalToken = tokenByLead.get(lead.id);
      if (!portalToken) { summary.skipped++; continue; }

      const portalUrl = `${APP_URL}/client-portal/${encodeURIComponent(portalToken)}?view=documents`;
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe-doc-reminders?token=${encodeURIComponent(portalToken)}`;
      const brokerName = brokerNameById.get(lead.broker_id || "") || "";

      // Build recipient list — primary + co-applicant + lead_applicants entries (deduped)
      const recipients: { name: string; email: string }[] = [];
      const seen = new Set<string>();
      const pushIf = (name: string, email: string | null | undefined) => {
        if (!email || !isValidEmail(email)) return;
        const key = email.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        recipients.push({ name: cleanText(name, "there") || "there", email });
      };
      pushIf(`${lead.first_name || ""} ${lead.last_name || ""}`.trim(), lead.email);
      const co = lead.co_applicant_contact_id ? coById.get(lead.co_applicant_contact_id) : null;
      if (co && !co.email_opt_out) pushIf(`${co.first_name || ""} ${co.last_name || ""}`.trim(), co.email);
      for (const a of applicantsByLead.get(lead.id) || []) pushIf(a.name, a.email);

      for (const rcpt of recipients) {
        const key = `${lead.id}::${rcpt.email.toLowerCase()}::${dayOffset}`;
        if (sentKeys.has(key)) { summary.skipped++; continue; }

        const html = buildReminderHtml({
          clientName: rcpt.name,
          brokerName,
          portalUrl,
          unsubscribeUrl,
          outstandingDocs: meta.names.slice(0, 30),
          dayOffset,
        });
        const subject = `Reminder: documents still outstanding for your Margin Finance application`;

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Margin Finance <notifications@margin.com.au>",
              to: [rcpt.email],
              subject,
              html,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            summary.errors++;
            await admin.from("document_reminder_sends").insert({
              lead_id: lead.id,
              recipient_email: rcpt.email,
              recipient_name: rcpt.name,
              day_offset: dayOffset,
              error: JSON.stringify(data).slice(0, 500),
            });
            continue;
          }
          summary.sent++;
          await admin.from("document_reminder_sends").insert({
            lead_id: lead.id,
            recipient_email: rcpt.email,
            recipient_name: rcpt.name,
            day_offset: dayOffset,
            resend_id: data?.id || null,
          });
        } catch (e) {
          summary.errors++;
          console.error("send error", e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-document-reminders error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message, ...summary }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});