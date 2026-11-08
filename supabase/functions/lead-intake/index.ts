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
    // Some senders nest the contact one level down
    const src = (body.contact && typeof body.contact === "object" ? body.contact : body) as Record<string, unknown>;

    const fullName = firstString(src.full_name, src.fullName, src.name);
    let firstName = firstString(src.first_name, src.firstName, src.firstname, src.first);
    let lastName = firstString(src.last_name, src.lastName, src.lastname, src.last);
    if (!firstName && fullName) {
      const parts = fullName.split(/\s+/);
      firstName = parts[0] || "";
      lastName = parts.slice(1).join(" ");
    }
    const email = firstString(src.email, src.email_address, src.emailAddress) || null;
    const phone = firstString(src.phone, src.mobile, src.phone_number, src.phoneNumber) || null;
    const loanAmount = parseAmount(src.loan_amount ?? src.loanAmount ?? src.amount ?? src.loan_size);
    const loanPurpose = mapPurpose(firstString(src.loan_purpose, src.loanPurpose, src.purpose));
    const sourceLabel = firstString(src.source_label, src.sourceLabel, src.source, src.lead_source) || "Website";
    const notes = firstString(src.notes, src.message, src.comments, src.note) || null;

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
      })
      .select("id")
      .single();

    if (leadError) {
      console.error("Lead insert failed:", leadError);
      return json({ error: `Could not create lead: ${leadError.message}` }, 500);
    }

    await supabase.from("notes").insert({
      lead_id: newLead.id,
      content: `🔗 Auto-created from ${sourceLabel} (webhook)${notes ? `\n\n${notes}` : ""}`,
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
