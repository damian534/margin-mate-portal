import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) return htmlResponse(`Authorization denied: ${error}`, null);
    if (!code || !stateRaw) return htmlResponse("Missing code or state", null);

    let state: { uid: string; redirect_to?: string };
    try {
      state = JSON.parse(atob(stateRaw));
    } catch {
      return htmlResponse("Invalid state", null);
    }

    const clientId = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-cal-oauth-callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed", tokens);
      return htmlResponse(`Token exchange failed: ${JSON.stringify(tokens)}`, null);
    }

    // Get user email
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoRes.json();

    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000)).toISOString();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertErr } = await admin.from("google_calendar_connections").upsert({
      user_id: state.uid,
      google_email: userInfo.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: expiresAt,
      scope: tokens.scope,
      calendar_id: "primary",
    }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("Upsert failed", upsertErr);
      return htmlResponse(`Save failed: ${upsertErr.message}`, null);
    }

    const redirectTo = state.redirect_to || "/admin";
    return htmlResponse("Connected! Redirecting...", redirectTo);
  } catch (e) {
    console.error("callback error", e);
    return htmlResponse(`Error: ${String(e)}`, null);
  }
});

function htmlResponse(message: string, redirectTo: string | null) {
  const script = redirectTo
    ? `<script>setTimeout(() => { window.location.href = ${JSON.stringify(redirectTo)}; }, 1200);</script>`
    : "";
  return new Response(
    `<!doctype html><html><head><title>Google Calendar</title>${script}</head>
<body style="font-family:system-ui;padding:40px;text-align:center;">
<h2>${message}</h2>
${redirectTo ? "<p>You can close this tab if it does not redirect.</p>" : ""}
</body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } },
  );
}