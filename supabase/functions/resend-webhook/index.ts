import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Resend webhook receiver — accepts events and writes engagement data.
// Optional signature verification: if RESEND_WEBHOOK_SECRET is set, the
// Svix-Signature header is validated. Otherwise the request is accepted as-is
// (recommended: set the secret).

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
}

async function verifySvix(secret: string, headers: Headers, payload: string): Promise<boolean> {
  try {
    const id = headers.get("svix-id");
    const ts = headers.get("svix-timestamp");
    const sig = headers.get("svix-signature");
    if (!id || !ts || !sig) return false;
    const cleanSecret = secret.replace(/^whsec_/, "");
    const keyBytes = Uint8Array.from(atob(cleanSecret), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const toSign = new TextEncoder().encode(`${id}.${ts}.${payload}`);
    const macBuf = await crypto.subtle.sign("HMAC", key, toSign);
    const expected = btoa(String.fromCharCode(...new Uint8Array(macBuf)));
    // Header is space-separated list of "v1,sig" — match any
    return sig.split(" ").some((part) => {
      const [, s] = part.split(",");
      return s === expected;
    });
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = await req.text();
  const secret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (secret) {
    const ok = await verifySvix(secret, req.headers, raw);
    if (!ok) return json({ error: "Invalid signature" }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const type: string = payload?.type || "";
  const data = payload?.data || {};
  const emailId: string | undefined = data.email_id || data.id;
  const to: string[] = Array.isArray(data.to) ? data.to : (data.to ? [data.to] : []);
  const recipient = to[0] || data.email || "";

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find the matching send row
  let send: any = null;
  if (emailId) {
    const { data: s } = await admin
      .from("email_campaign_sends")
      .select("id, campaign_id, broker_id, recipient_email")
      .eq("resend_id", emailId)
      .maybeSingle();
    send = s;
  }
  if (!send && recipient) {
    // Fallback: most recent send to this address
    const { data: s } = await admin
      .from("email_campaign_sends")
      .select("id, campaign_id, broker_id, recipient_email")
      .eq("recipient_email", recipient)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    send = s;
  }

  // Map Resend event -> our event_type
  const map: Record<string, string> = {
    "email.delivered": "delivered",
    "email.opened": "opened",
    "email.clicked": "clicked",
    "email.bounced": "bounced",
    "email.complained": "complained",
    "email.delivery_delayed": "delayed",
    "email.failed": "failed",
  };
  const eventType = map[type];
  if (!eventType) return json({ ok: true, ignored: type });

  if (!send) {
    // Log orphan event for visibility but don't fail
    console.log("Orphan event", type, emailId, recipient);
    return json({ ok: true, orphan: true });
  }

  const click = data.click || {};
  await admin.from("email_events").insert({
    send_id: send.id,
    campaign_id: send.campaign_id,
    broker_id: send.broker_id,
    recipient_email: send.recipient_email || recipient,
    event_type: eventType,
    link_url: click.link || click.url || null,
    user_agent: click.userAgent || data.user_agent || null,
    ip_address: click.ipAddress || data.ip_address || null,
    metadata: data,
    occurred_at: data.created_at || new Date().toISOString(),
  });

  // Auto-suppress on bounce/complaint if enabled for this broker
  if (eventType === "bounced" || eventType === "complained") {
    const { data: settings } = await admin
      .from("broker_email_settings")
      .select("auto_suppress_bounces")
      .eq("broker_id", send.broker_id)
      .maybeSingle();
    const auto = settings?.auto_suppress_bounces ?? true;
    if (auto) {
      await admin.from("email_suppressions").upsert({
        broker_id: send.broker_id,
        email: (send.recipient_email || recipient).toLowerCase(),
        reason: eventType === "bounced" ? "bounce" : "complaint",
        source_campaign_id: send.campaign_id,
      }, { onConflict: "broker_id,email" });
    }
  }

  return json({ ok: true });
});