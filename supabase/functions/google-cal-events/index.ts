import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: conn } = await admin
      .from("google_calendar_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!conn) return json({ error: "Not connected", not_connected: true }, 400);

    const accessToken = await ensureFreshToken(admin, conn);

    const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
    const action = body.action || (req.method === "GET" ? "list" : null);
    const calendarId = encodeURIComponent(conn.calendar_id || "primary");

    if (action === "list") {
      const url = new URL(req.url);
      const timeMin = url.searchParams.get("timeMin") || body.timeMin || new Date(Date.now() - 7*86400000).toISOString();
      const timeMax = url.searchParams.get("timeMax") || body.timeMax || new Date(Date.now() + 60*86400000).toISOString();
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await r.json();
      if (!r.ok) return json({ error: data }, r.status);
      return json({ events: data.items || [] }, 200);
    }

    if (action === "create") {
      const { lead_id, title, description, start, end, attendees, location } = body;
      if (!title || !start || !end) return json({ error: "Missing title/start/end" }, 400);
      const eventBody: any = {
        summary: title,
        description,
        location,
        start: { dateTime: start },
        end: { dateTime: end },
        attendees: (attendees || []).map((email: string) => ({ email })),
        conferenceData: {
          createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: "hangoutsMeet" } },
        },
      };
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=all`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(eventBody),
        }
      );
      const data = await r.json();
      if (!r.ok) return json({ error: data }, r.status);

      if (lead_id) {
        await admin.from("lead_calendar_events").insert({
          lead_id, user_id: user.id,
          google_event_id: data.id,
          calendar_id: conn.calendar_id,
          title, description, start_time: start, end_time: end,
          attendees: attendees || [], location,
          meeting_link: data.hangoutLink || null,
        });
      }
      return json({ event: data }, 200);
    }

    if (action === "update") {
      const { event_id, title, description, start, end, attendees, location } = body;
      if (!event_id) return json({ error: "Missing event_id" }, 400);
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(event_id)}?sendUpdates=all`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: title, description, location,
            start: start ? { dateTime: start } : undefined,
            end: end ? { dateTime: end } : undefined,
            attendees: attendees ? attendees.map((email: string) => ({ email })) : undefined,
          }),
        }
      );
      const data = await r.json();
      if (!r.ok) return json({ error: data }, r.status);

      await admin.from("lead_calendar_events").update({
        title, description,
        start_time: start, end_time: end,
        attendees: attendees || [], location,
      }).eq("google_event_id", event_id).eq("user_id", user.id);
      return json({ event: data }, 200);
    }

    if (action === "delete") {
      const { event_id } = body;
      if (!event_id) return json({ error: "Missing event_id" }, 400);
      const r = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${encodeURIComponent(event_id)}?sendUpdates=all`,
        { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!r.ok && r.status !== 410) {
        const data = await r.json().catch(() => ({}));
        return json({ error: data }, r.status);
      }
      await admin.from("lead_calendar_events").delete().eq("google_event_id", event_id).eq("user_id", user.id);
      return json({ ok: true }, 200);
    }

    if (action === "disconnect") {
      await admin.from("google_calendar_connections").delete().eq("user_id", user.id);
      return json({ ok: true }, 200);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("events error", e);
    return json({ error: String(e) }, 500);
  }
});

async function ensureFreshToken(admin: any, conn: any): Promise<string> {
  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (expiresAt - Date.now() > 60_000) return conn.access_token;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET")!,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const t = await r.json();
  if (!r.ok) throw new Error(`Token refresh failed: ${JSON.stringify(t)}`);
  const newExpires = new Date(Date.now() + (t.expires_in * 1000)).toISOString();
  await admin.from("google_calendar_connections").update({
    access_token: t.access_token,
    token_expires_at: newExpires,
  }).eq("user_id", conn.user_id);
  return t.access_token;
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}