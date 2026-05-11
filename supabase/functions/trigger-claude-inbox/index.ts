import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Resolve broker_id (broker/super_admin = self, staff = profile.broker_id)
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", user.id);
    const roles = (roleRow ?? []).map((r: any) => r.role);
    const isAdminTeam = roles.some((r: string) =>
      ["broker", "super_admin", "broker_staff"].includes(r)
    );
    if (!isAdminTeam) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let brokerId: string | null = null;
    if (roles.includes("broker") || roles.includes("super_admin")) {
      brokerId = user.id;
    } else {
      const { data: prof } = await admin
        .from("profiles").select("broker_id").eq("user_id", user.id).maybeSingle();
      brokerId = prof?.broker_id ?? null;
    }
    if (!brokerId) {
      return new Response(JSON.stringify({ error: "No broker context" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("broker_email_settings")
      .select("claude_webhook_url, claude_webhook_secret, claude_webhook_enabled, claude_default_prompt")
      .eq("broker_id", brokerId)
      .maybeSingle();

    if (!settings?.claude_webhook_enabled || !settings?.claude_webhook_url) {
      return new Response(JSON.stringify({
        error: "Claude webhook not configured. Ask your broker to set it up in Settings.",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let body: any = {};
    try { body = await req.json(); } catch { /* no body */ }

    const { data: profile } = await admin
      .from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();

    const payload = {
      action: "process_inbox",
      prompt: body.prompt || settings.claude_default_prompt || "Process the inbox",
      triggered_by: {
        user_id: user.id,
        name: profile?.full_name ?? null,
        email: profile?.email ?? null,
      },
      lead_id: body.lead_id ?? null,
      timestamp: new Date().toISOString(),
    };

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (settings.claude_webhook_secret) {
      headers["X-Webhook-Secret"] = settings.claude_webhook_secret;
    }

    const resp = await fetch(settings.claude_webhook_url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    if (!resp.ok) {
      console.error("Webhook failed", resp.status, text);
      return new Response(JSON.stringify({
        error: `Webhook returned ${resp.status}`,
        detail: text.slice(0, 500),
      }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, response: text.slice(0, 500) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("trigger-claude-inbox error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});