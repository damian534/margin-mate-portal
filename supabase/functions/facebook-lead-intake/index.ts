import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Zapier → Facebook Lead Ads intake. Authenticated by the x-api-key header
// matching FB_LEAD_INTAKE_SECRET. Leads land in the "New" stage, tagged
// "Paid Ads", with no referrer (so the card shows "Direct").

const DEFAULT_BROKER_ID = "88fa4fe4-2468-4665-8c52-a658582d78cc"; // Damian Medici
const KNOWN = new Set([
  "facebook_lead_id", "full_name", "first_name", "last_name", "email", "phone",
  "created_time", "platform", "page_name", "form_name", "campaign_name", "adset_name", "ad_name",
]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

export function normalisePhone(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) return "+" + d.slice(1).replace(/\D/g, "");
  if (d.startsWith("0061")) d = d.slice(4);
  else if (d.startsWith("61") && d.length >= 11) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return d ? `+61${d}` : null;
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const secret = Deno.env.get("FB_LEAD_INTAKE_SECRET");
    const key = req.headers.get("x-api-key") || "";
    if (!secret || !key || !safeEqual(key, secret)) return json({ error: "Unauthorized" }, 401);

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body must be valid JSON" }, 400);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Body must be a JSON object" }, 400);

    const fbId = str(body.facebook_lead_id) || null;
    let first = str(body.first_name), last = str(body.last_name);
    const full = str(body.full_name) || [first, last].filter(Boolean).join(" ");
    if (!first && full) { const p = full.split(/\s+/); first = p[0]; last = p.slice(1).join(" "); }
    const email = str(body.email).toLowerCase() || null;
    const phone = normalisePhone(str(body.phone));
    if (!full && !email && !phone) return json({ error: "Provide at least one of full_name, email or phone" }, 400);

    let createdAt = new Date().toISOString();
    if (str(body.created_time)) {
      const d = new Date(str(body.created_time));
      if (isNaN(d.getTime())) return json({ error: "created_time is not a valid date" }, 400);
      createdAt = d.toISOString();
    }

    const attr: Record<string, string> = {};
    for (const k of ["campaign_name", "adset_name", "ad_name", "form_name", "platform", "page_name"]) if (str(body[k])) attr[k] = str(body[k]);
    const answers: { question: string; answer: string }[] = [];
    for (const [k, v] of Object.entries(body)) {
      if (KNOWN.has(k)) continue;
      const a = typeof v === "object" && v !== null ? JSON.stringify(v) : str(v);
      if (a) answers.push({ question: k.replace(/_/g, " ").trim(), answer: a });
    }

    const noteLines = (heading: string) => {
      const l = [heading];
      if (attr.campaign_name) l.push(`Campaign: ${attr.campaign_name}`);
      if (attr.adset_name) l.push(`Ad set: ${attr.adset_name}`);
      if (attr.ad_name) l.push(`Ad: ${attr.ad_name}`);
      if (attr.form_name) l.push(`Form: ${attr.form_name}`);
      if (attr.platform) l.push(`Platform: ${attr.platform}`);
      if (attr.page_name) l.push(`Page: ${attr.page_name}`);
      if (answers.length) l.push("", ...answers.map((a) => `${a.question}: ${a.answer}`));
      return l.join("\n");
    };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const brokerId = Deno.env.get("FB_LEAD_BROKER_ID") || DEFAULT_BROKER_ID;

    if (fbId) {
      const { data: dup } = await supabase.from("leads").select("id").eq("facebook_lead_id", fbId).maybeSingle();
      if (dup) return json({ status: "duplicate", lead_id: dup.id });
    }

    // Existing lead with same email or phone → add a note instead
    const ors: string[] = [];
    if (email) ors.push(`email.ilike.${email.replace(/[,()]/g, "")}`);
    if (phone) ors.push(`phone.eq.${phone}`);
    let existing: { id: string } | null = null;
    if (ors.length) {
      const { data } = await supabase.from("leads").select("id").eq("broker_id", brokerId).or(ors.join(",")).order("created_at", { ascending: false }).limit(1);
      existing = data?.[0] ?? null;
    }
    if (!existing && phone) {
      // Match phones stored in local format, e.g. "0412 345 678"
      const local = "0" + phone.slice(3);
      const { data } = await supabase.from("leads").select("id, phone").eq("broker_id", brokerId).ilike("phone", `%${local.slice(-6)}%`).limit(20);
      existing = (data || []).find((l) => normalisePhone(str(l.phone)) === phone) ?? null;
    }
    if (existing) {
      const { error } = await supabase.from("notes").insert({
        lead_id: existing.id, author_id: brokerId,
        content: noteLines("📥 Submitted a new Facebook lead form"),
      });
      if (error) console.error("Merge note failed:", error);
      return json({ status: "merged", lead_id: existing.id });
    }

    const { data: contact } = await supabase.from("contacts")
      .insert({ first_name: first || "Unknown", last_name: last, email, phone, type: "client", created_by: brokerId })
      .select("id").maybeSingle();

    const customFields: Record<string, unknown> = {};
    if (answers.length) customFields.form_answers = answers;
    const adAttr: Record<string, string> = {};
    if (attr.campaign_name) adAttr.campaign = attr.campaign_name;
    if (attr.adset_name) adAttr.adset = attr.adset_name;
    if (attr.ad_name) adAttr.ad = attr.ad_name;
    if (attr.form_name) adAttr.form_name = attr.form_name;
    if (Object.keys(adAttr).length) customFields.ad_attribution = adAttr;

    const { data: lead, error } = await supabase.from("leads").insert({
      first_name: first || "Unknown", last_name: last, email, phone,
      source: "paid_ads", status: "new", broker_id: brokerId,
      source_contact_id: contact?.id ?? null, created_at: createdAt,
      facebook_lead_id: fbId, custom_fields: customFields,
      metadata: { facebook: { ...attr, facebook_lead_id: fbId, created_time: str(body.created_time) || null }, form_answers: answers },
    }).select("id").single();

    if (error) {
      if (error.code === "23505" && fbId) return json({ status: "duplicate" });
      console.error("Lead insert failed:", error);
      return json({ error: `Could not create lead: ${error.message}` }, 500);
    }

    const { error: noteErr } = await supabase.from("notes").insert({
      lead_id: lead.id, author_id: brokerId, content: noteLines("🔗 New Facebook lead (Zapier)"),
    });
    if (noteErr) console.error("Note insert failed:", noteErr);

    // Email the broker about the new lead (best-effort)
    try {
      const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-new-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          lead: { first_name: first || "Unknown", last_name: last, email, phone, source: "Facebook (Paid Ads)" },
          broker_id: brokerId,
        }),
      });
      console.log("notify-new-lead:", r.status, await r.text());
    } catch (err) {
      console.error("Failed to notify broker:", err);
    }

    return json({ status: "created", lead_id: lead.id });
  } catch (e) {
    console.error("facebook-lead-intake error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
