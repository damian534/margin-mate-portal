import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function html(body: string, status = 200) {
  return new Response(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Margin Finance — Reminders</title>
<style>
  body { font-family:'Poppins',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f5f5f5; margin:0; padding:48px 16px; color:#1a1a1a; }
  .card { max-width:520px; margin:0 auto; background:#fff; border-radius:12px; padding:40px 32px; text-align:center; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
  h1 { color:#e63946; margin:0 0 12px; font-size:22px; }
  p { color:#4a4a4a; line-height:1.6; font-size:15px; }
</style></head><body><div class="card">${body}</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();
  if (!token || token.length > 128) {
    return html(`<h1>Invalid link</h1><p>This unsubscribe link is invalid or incomplete.</p>`, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenRow } = await admin
    .from("client_portal_tokens")
    .select("lead_id, is_active")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return html(`<h1>Link expired</h1><p>This unsubscribe link is no longer valid. Please reply to your broker if you'd like to stop reminders.</p>`, 404);
  }

  const { error } = await admin
    .from("leads")
    .update({ doc_reminders_paused: true })
    .eq("id", tokenRow.lead_id);

  if (error) {
    return html(`<h1>Something went wrong</h1><p>We couldn't update your preference. Please reply to your broker directly.</p>`, 500);
  }

  return html(`<h1>You're unsubscribed</h1><p>You won't receive further document reminder emails for this application. Your broker will be notified.</p>`);
});