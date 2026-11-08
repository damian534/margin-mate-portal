import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Generic inbound lead intake for external systems — GHL workflow webhooks,
// Zapier/Make, website forms. Authenticated by a per-brokerage intake key
// passed as ?key=... or the X-Intake-Key header. Creates contact + lead +
// deal-history note, then notifies the brokerage.

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function firstString(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
}

function parseAmount(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v) && v > 0) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^0-9.]/g, ""));
    return isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function mapPurpose(v: string): string | null {
  const t = v.toLowerCase();
  if (!t) return null;
  if (t.includes("refin")) return "refinance";
  if (t.includes("invest")) return "investment";
  if (t.includes("first")) return "first_home";
  if (t.includes("next") || t.includes("upgrad") || t.includes("mov")) return "next_home";
  return null;
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "website";
}

// Fields already mapped to lead/contact columns or ad attribution — everything
// else in the payload is treated as a form question + answer.
const KNOWN_FIELD_KEYS = new Set([
  "full_name", "fullname", "name", "first_name", "firstname", "first",
  "last_name", "lastname", "last",
  "email", "email_address", "emailaddress",
  "phone", "mobile", "phone_number", "phonenumber",
  "loan_amount", "loanamount", "amount", "loan_size",
  "loan_purpose", "loanpurpose", "purpose",
  "source_label", "sourcelabel", "source", "lead_source", "customdata.source",
  "notes", "message", "comments", "note",
  "campaign", "campaign_name", "campaignname", "utm_campaign",
  "adset", "ad_set", "adset_name", "adsetname",
  "ad", "ad_name", "adname",
  "form", "form_name", "formname", "form.name", "form.id", "formid", "form_id",
  // common GHL / Zapier system fields that aren't answers
  "contact_id", "contactid", "location_id", "locationid", "location",
  "workflow", "workflow_id", "workflowid", "tags", "tag", "dnd",
  "address", "address1", "city", "state", "country", "postal_code", "zip",
  "website", "timezone", "companyname", "company_name",
  "date_created", "datecreated", "date_added", "created_at", "updated_at",
  "opportunity", "pipeline", "stage", "assigned_to",
  "event", "eventtype", "event_type", "trigger", "type", "status", "id", "key",
  "page", "url", "ip", "user_agent",
  "utm_source", "utm_medium", "utm_term", "utm_content",
]);

// Nested object keys that are just wrappers — their inner fields are lifted up
const CONTAINER_SEGMENTS = new Set([
  "contact", "customdata", "customfields", "custom_fields", "fields",
  "submission", "data", "attributes", "payload",
  "triggerdata", "trigger_data", "formdata", "form_data",
]);

// Whole subtrees that are system noise (GHL location details, UTM blobs, …)
const SKIP_SUBTREES = new Set([
  "location", "attributionsource", "attribution_source", "latestattributionsource",
  "dndsettings", "dnd_settings", "opportunity", "workflow",
]);

function normalizeKey(k: string): string {
  const parts = k.toLowerCase().split(".").filter((p) => !CONTAINER_SEGMENTS.has(p));
  return parts.join(".");
}

function prettifyQuestion(k: string): string {
  const s = normalizeKey(k)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function cleanAnswer(v: string): string {
  const t = v.trim();
  // Form builders often encode spaces as underscores in option values
  if (t.includes("_") && !t.includes(" ")) return t.replace(/_+/g, " ").trim();
  return t;
}

// Flatten whatever the sender posts into dotted key → string pairs. Handles
// nested objects (GHL's standard Webhook payload), arrays of name/value pairs
// (Meta-style), and JSON-encoded strings, so no per-field mapping is needed.
function flattenPayload(root: Record<string, unknown>): [string, string][] {
  const out: [string, string][] = [];
  const walk = (obj: Record<string, unknown>, prefix: string, depth: number) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v == null) continue;
      const key = prefix ? `${prefix}.${k}` : k;
      if (Array.isArray(v)) {
        // Arrays of {name/key/field/question/label, value/answer} pairs
        for (const item of v) {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            const rec = item as Record<string, unknown>;
            const q = firstString(rec.name, rec.key, rec.field, rec.question, rec.label);
            const raw = rec.value ?? rec.answer;
            const a = Array.isArray(raw) ? raw.join(", ") : raw != null ? String(raw) : "";
            if (q && a.trim()) out.push([q, a]);
          }
        }
        continue;
      }
      if (typeof v === "object") {
        if (SKIP_SUBTREES.has(k.toLowerCase())) {
          // Keep the campaign name from GHL attribution blobs, skip the rest
          const rec = v as Record<string, unknown>;
          const camp = firstString(rec.campaign, rec.utmCampaign, rec.utm_campaign);
          if (camp) out.push(["utm_campaign", camp]);
          continue;
        }
        if (depth < 3) walk(v as Record<string, unknown>, key, depth + 1);
        continue;
      }
      const s = String(v).trim();
      if (!s || s === "null" || s === "undefined") continue;
      // Some senders put a JSON-encoded blob inside a string field
      if (s.startsWith("{") && s.endsWith("}")) {
        try {
          walk(JSON.parse(s) as Record<string, unknown>, key, depth + 1);
          continue;
        } catch { /* not JSON — keep as a plain value */ }
      }
      out.push([key, s]);
    }
  };
  walk(root, "", 0);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST only" }, 405);
  }

  try {
    const url = new URL(req.url);
    const key = url.searchParams.get("key") || req.headers.get("x-intake-key") || "";
    if (!key) return json({ error: "Missing intake key" }, 401);

    // Accept JSON or form-encoded bodies (GHL / Zapier send either)
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      form.forEach((v, k) => {
        body[k] = v;
      });
    } else {
      body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    }
    // Flatten whatever was posted — GHL's standard Webhook action sends the whole
    // contact + form submission dump (nested), Custom Webhook / Zapier send flatter
    // JSON. Flattening means new or changed form questions are captured without
    // any field-mapping changes.
    // Temporary diagnostics: see exactly what the sender posted (tune parsing)
    console.log("Intake payload:", JSON.stringify(body).slice(0, 4000));

    const entries = flattenPayload(body);
    const flat: Record<string, string> = {};
    const stripped: Record<string, string> = {};
    for (const [k, v] of entries) {
      flat[k.toLowerCase()] = v;
      const nk = normalizeKey(k);
      if (!(nk in stripped)) stripped[nk] = v;
    }
    const get = (...keys: string[]): string =>
      firstString(...keys.map((k) => flat[k] ?? stripped[k]));

    const fullName = get("full_name", "fullname", "name");
    let firstName = get("first_name", "firstname", "first");
    let lastName = get("last_name", "lastname", "last");
    if (!firstName && fullName) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }
    const email = get("email", "email_address", "emailaddress") || null;
    const phone = get("phone", "mobile", "phone_number", "phonenumber") || null;
    const loanAmount = parseAmount(get("loan_amount", "loanamount", "amount", "loan_size"));
    const loanPurpose = mapPurpose(get("loan_purpose", "loanpurpose", "purpose"));
    const sourceLabel = get("source_label", "sourcelabel", "lead_source", "customdata.source", "source") || "Website";
    const notes = get("notes", "message", "comments", "note") || null;

    // Which campaign / ad set / ad / form the lead came from (if provided)
    const attribution: Record<string, string> = {};
    const campaign = get("campaign", "campaign_name", "campaignname", "utm_campaign");
    const adset = get("adset", "ad_set", "adset_name", "adsetname");
    const ad = get("ad", "ad_name", "adname");
    const formName = get("form_name", "formname", "form.name");
    if (campaign) attribution.campaign = campaign;
    if (adset) attribution.adset = adset;
    if (ad) attribution.ad = ad;
    if (formName) attribution.form_name = formName;

    // Every remaining field is treated as a form question + answer, so landing
    // page / survey questions show on the deal with no field mapping needed
    const formAnswers: { question: string; answer: string }[] = [];
    const seenQuestions = new Set<string>();
    for (const [k, v] of entries) {
      const nk = normalizeKey(k);
      if (KNOWN_FIELD_KEYS.has(nk) || KNOWN_FIELD_KEYS.has(k.toLowerCase())) continue;
      const answer = cleanAnswer(v);
      if (!answer || answer.length > 2000) continue;
      const question = prettifyQuestion(k);
      if (!question || seenQuestions.has(question.toLowerCase())) continue;
      seenQuestions.add(question.toLowerCase());
      formAnswers.push({ question, answer });
    }

    const customFields: Record<string, unknown> = {};
    if (formAnswers.length > 0) customFields.form_answers = formAnswers;
    if (Object.keys(attribution).length > 0) customFields.ad_attribution = attribution;

    if (!firstName && !email && !phone) {
      return json({ error: "Provide at least a name, email or phone for the lead" }, 400);
    }
    if (!firstName) firstName = "Unknown";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve the brokerage from the intake key
    const { data: settings } = await supabase
      .from("broker_email_settings")
      .select("broker_id")
      .eq("inbound_webhook_key", key)
      .maybeSingle();
    if (!settings?.broker_id) return json({ error: "Invalid intake key" }, 401);
    const brokerId = settings.broker_id;

    // Match an existing lead source by name or label, otherwise create it
    const { data: allSources } = await supabase.from("lead_sources").select("name, label, display_order");
    const wanted = sourceLabel.toLowerCase();
    const wantedSlug = slugify(sourceLabel);
    let sourceName = wantedSlug;
    const match = (allSources || []).find(
      (s) => s.name.toLowerCase() === wantedSlug || s.label.toLowerCase() === wanted || s.name.toLowerCase() === wanted,
    );
    if (match) {
      sourceName = match.name;
    } else {
      const maxOrder = (allSources || []).reduce((m, s) => Math.max(m, s.display_order ?? 0), 0);
      const { data: created } = await supabase
        .from("lead_sources")
        .insert({ name: wantedSlug, label: sourceLabel, display_order: maxOrder + 1 })
        .select("name")
        .maybeSingle();
      if (created?.name) sourceName = created.name;
    }

    // Contact first so the lead card can open it
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        type: "client",
        notes,
        created_by: brokerId,
      })
      .select("id")
      .maybeSingle();

    const { data: newLead, error: leadError } = await supabase
      .from("leads")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        loan_amount: loanAmount,
        loan_purpose: loanPurpose,
        source: sourceName,
        status: "new",
        broker_id: brokerId,
        source_contact_id: newContact?.id || null,
        custom_fields: customFields,
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Lead insert failed:", leadError);
      return json({ error: `Could not create lead: ${leadError.message}` }, 500);
    }

    const noteLines = [`🔗 Auto-created from ${sourceLabel} (webhook)`];
    if (attribution.campaign) noteLines.push(`Campaign: ${attribution.campaign}`);
    if (attribution.adset) noteLines.push(`Ad set: ${attribution.adset}`);
    if (attribution.ad) noteLines.push(`Ad: ${attribution.ad}`);
    if (notes) noteLines.push("", notes);
    if (formAnswers.length > 0) {
      noteLines.push("", ...formAnswers.map((a) => `${a.question}: ${a.answer}`));
    }
    await supabase.from("notes").insert({
      lead_id: newLead.id,
      content: noteLines.join("\n"),
      author_id: brokerId,
    });

    // Notify the brokerage (best-effort)
    try {
      await fetch(`${supabaseUrl}/functions/v1/notify-new-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          lead: {
            first_name: firstName,
            last_name: lastName,
            email,
            phone,
            loan_amount: loanAmount,
            loan_purpose: loanPurpose,
            source: sourceName,
          },
          broker_id: brokerId,
        }),
      });
    } catch (notifyErr) {
      console.error("Failed to notify brokerage:", notifyErr);
    }

    console.log("Intake lead created:", newLead.id, "| source:", sourceName, "| broker:", brokerId);
    return json({ success: true, lead_id: newLead.id });
  } catch (error) {
    console.error("lead-intake error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
