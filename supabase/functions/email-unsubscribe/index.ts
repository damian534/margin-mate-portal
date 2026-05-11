import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px}.card{background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.06);padding:40px;max-width:440px;text-align:center}h1{font-size:20px;margin:0 0 12px}p{color:#64748b;line-height:1.5;margin:8px 0}</style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  if (!token) return html(`<h1>Invalid link</h1><p>This unsubscribe link is missing required information.</p>`, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: send } = await admin
    .from("email_campaign_sends")
    .select("id, campaign_id, broker_id, recipient_email, recipient_id, recipient_type")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!send) return html(`<h1>Link not found</h1><p>This unsubscribe link is no longer valid.</p>`, 404);

  // Add to suppression list
  await admin.from("email_suppressions").upsert({
    broker_id: send.broker_id,
    email: send.recipient_email.toLowerCase(),
    reason: "unsubscribe",
    source_campaign_id: send.campaign_id,
  }, { onConflict: "broker_id,email" });

  // Mark contact / partner as opted out
  if (send.recipient_type === "contact" && send.recipient_id) {
    await admin.from("contacts").update({ email_opt_out: true }).eq("id", send.recipient_id);
  } else if (send.recipient_type === "partner" && send.recipient_id) {
    await admin.from("profiles").update({ email_opt_out: true }).eq("id", send.recipient_id);
  }

  // Log event
  await admin.from("email_events").insert({
    send_id: send.id,
    campaign_id: send.campaign_id,
    broker_id: send.broker_id,
    recipient_email: send.recipient_email,
    event_type: "unsubscribed",
  });

  return html(`<h1>You've been unsubscribed</h1><p><strong>${send.recipient_email}</strong> will no longer receive marketing emails from us.</p><p style="margin-top:24px;font-size:12px;color:#94a3b8">Changed your mind? Reply to any email and we'll add you back.</p>`);
});