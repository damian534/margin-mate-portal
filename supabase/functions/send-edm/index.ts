import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend/emails";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function applyMergeTags(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => escapeHtml(vars[k] ?? ""));
}

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Fetch broker_id via SECURITY DEFINER func
    const { data: brokerIdRes } = await admin.rpc("get_my_broker_id", { _user_id: user.id });
    const brokerId = brokerIdRes as string | null;
    if (!brokerId) return json({ error: "No broker context" }, 400);

    if (action === "preview_audience") {
      const { sources = ["contacts", "partners"], tags = [] } = body;
      const recips = await collectRecipients(admin, brokerId, sources, tags);
      return json({ count: recips.length, sample: recips.slice(0, 25) });
    }

    if (action === "send") {
      const { campaign_id } = body;
      if (!campaign_id) return json({ error: "campaign_id required" }, 400);

      const { data: campaign, error: cErr } = await admin
        .from("email_campaigns").select("*").eq("id", campaign_id).maybeSingle();
      if (cErr || !campaign) return json({ error: "Campaign not found" }, 404);
      if (campaign.broker_id !== brokerId) return json({ error: "Forbidden" }, 403);
      if (campaign.status === "sent" || campaign.status === "sending") {
        return json({ error: "Campaign already sent or sending" }, 400);
      }

      const recipients = await collectRecipients(
        admin, brokerId,
        campaign.audience_sources || ["contacts", "partners"],
        campaign.audience_tags || [],
      );
      if (recipients.length === 0) return json({ error: "No recipients match this audience" }, 400);

      await admin.from("email_campaigns").update({
        status: "sending", total_recipients: recipients.length,
      }).eq("id", campaign_id);

      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!RESEND_KEY || !LOVABLE_KEY) {
        await admin.from("email_campaigns").update({ status: "failed" }).eq("id", campaign_id);
        return json({ error: "Email service not configured" }, 500);
      }

      const fromName = campaign.from_name || "Margin Connect";
      const fromEmail = campaign.from_email || "onboarding@resend.dev";
      const fromHeader = `${fromName} <${fromEmail}>`;

      let sent = 0, failed = 0;
      const sendLogs: any[] = [];

      // Sequential to be gentle on rate limits
      for (const r of recipients) {
        const vars = {
          first_name: r.first_name || "",
          last_name: r.last_name || "",
          full_name: [r.first_name, r.last_name].filter(Boolean).join(" "),
          email: r.email,
        };
        const subject = applyMergeTags(campaign.subject, vars);
        const html = applyMergeTags(campaign.body_html, vars);
        try {
          const resp = await fetch(RESEND_GATEWAY, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${LOVABLE_KEY}`,
              "X-Connection-Api-Key": RESEND_KEY,
            },
            body: JSON.stringify({ from: fromHeader, to: [r.email], subject, html }),
          });
          const data = await resp.json().catch(() => ({}));
          if (!resp.ok) {
            failed++;
            sendLogs.push({ campaign_id, broker_id: brokerId, recipient_email: r.email, recipient_name: vars.full_name, recipient_type: r.type, recipient_id: r.id, status: "failed", error: JSON.stringify(data).slice(0, 500) });
          } else {
            sent++;
            sendLogs.push({ campaign_id, broker_id: brokerId, recipient_email: r.email, recipient_name: vars.full_name, recipient_type: r.type, recipient_id: r.id, status: "sent", sent_at: new Date().toISOString() });
          }
        } catch (e) {
          failed++;
          sendLogs.push({ campaign_id, broker_id: brokerId, recipient_email: r.email, recipient_name: vars.full_name, recipient_type: r.type, recipient_id: r.id, status: "failed", error: String(e).slice(0, 500) });
        }
        // throttle ~5/sec
        await new Promise((res) => setTimeout(res, 200));
      }

      // Insert in chunks of 200
      for (let i = 0; i < sendLogs.length; i += 200) {
        await admin.from("email_campaign_sends").insert(sendLogs.slice(i, i + 200));
      }

      await admin.from("email_campaigns").update({
        status: failed > 0 && sent === 0 ? "failed" : "sent",
        sent_count: sent, failed_count: failed,
        sent_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      return json({ ok: true, sent, failed, total: recipients.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("send-edm error", e);
    return json({ error: String(e) }, 500);
  }
});

async function collectRecipients(admin: any, brokerId: string, sources: string[], tags: string[]) {
  const out: { id: string; email: string; first_name: string; last_name: string; type: string }[] = [];
  const seen = new Set<string>();
  const tagFilter = (t: string[] | null) => tags.length === 0 ? true : (t || []).some((x) => tags.includes(x));

  if (sources.includes("contacts")) {
    const { data } = await admin
      .from("contacts")
      .select("id, first_name, last_name, email, audience_tags, email_opt_out")
      .eq("created_by", brokerId)
      .not("email", "is", null)
      .eq("email_opt_out", false);
    for (const c of data || []) {
      if (!c.email || seen.has(c.email.toLowerCase())) continue;
      if (!tagFilter(c.audience_tags)) continue;
      seen.add(c.email.toLowerCase());
      out.push({ id: c.id, email: c.email, first_name: c.first_name || "", last_name: c.last_name || "", type: "contact" });
    }
  }
  if (sources.includes("partners")) {
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email, audience_tags, email_opt_out")
      .eq("broker_id", brokerId)
      .not("email", "is", null)
      .eq("email_opt_out", false);
    for (const p of data || []) {
      if (!p.email || seen.has(p.email.toLowerCase())) continue;
      if (!tagFilter(p.audience_tags)) continue;
      const [first, ...rest] = (p.full_name || "").split(" ");
      seen.add(p.email.toLowerCase());
      out.push({ id: p.id, email: p.email, first_name: first || "", last_name: rest.join(" "), type: "partner" });
    }
  }
  return out;
}