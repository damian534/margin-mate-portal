import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Meta Lead Ads webhook receiver.
// GET  — webhook verification handshake (hub.mode, hub.verify_token, hub.challenge)
// POST — leadgen events; fetches each lead's field data from the Graph API and
//        creates a contact + lead in the CRM with source "Facebook / Instagram Ad".

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const verifyToken = Deno.env.get("META_VERIFY_TOKEN");
  const pageToken = Deno.env.get("META_PAGE_ACCESS_TOKEN");

  // --- Webhook verification (Meta calls this once when you save the callback URL) ---
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === verifyToken) {
      console.log("Meta webhook verified");
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    if (body.object !== "page") {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pageToken) throw new Error("META_PAGE_ACCESS_TOKEN is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Collect every leadgen event in the payload
    const leadgenIds: string[] = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen" && change.value?.leadgen_id) {
          leadgenIds.push(String(change.value.leadgen_id));
        }
      }
    }
    console.log("Leadgen events received:", leadgenIds.length);

    // Resolve the lead source row once (create it if missing)
    let sourceName = "facebook_instagram_ad";
    const { data: existingSource } = await supabase
      .from("lead_sources")
      .select("name")
      .or("name.ilike.%facebook%,name.ilike.%instagram%,label.ilike.%facebook%,label.ilike.%instagram%")
      .limit(1)
      .maybeSingle();
    if (existingSource?.name) {
      sourceName = existingSource.name;
    } else {
      const { data: maxOrder } = await supabase
        .from("lead_sources").select("display_order").order("display_order", { ascending: false }).limit(1).maybeSingle();
      const { data: created } = await supabase.from("lead_sources").insert({
        name: sourceName,
        label: "Facebook / Instagram Ad",
        display_order: (maxOrder?.display_order ?? 0) + 1,
      }).select("name").maybeSingle();
      if (created?.name) sourceName = created.name;
    }

    // Find a broker to own the leads (same rule as inbound-lead)
    const { data: brokerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["broker", "super_admin"])
      .limit(1)
      .single();
    const brokerId = brokerRole?.user_id || null;

    const results: { leadgen_id: string; lead_id?: string; error?: string }[] = [];

    for (const leadgenId of leadgenIds) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${encodeURIComponent(pageToken)}`,
        );
        const leadData = await res.json();
        if (!res.ok) {
          console.error("Graph API error for", leadgenId, res.status, JSON.stringify(leadData));
          results.push({ leadgen_id: leadgenId, error: `Meta API error [${res.status}]` });
          continue;
        }

        // field_data: [{ name: "full_name"|"email"|"phone_number"|..., values: ["..."] }]
        const fields: Record<string, string> = {};
        for (const f of leadData.field_data || []) {
          fields[String(f.name).toLowerCase()] = (f.values || [])[0] || "";
        }

        let firstName = fields.first_name || "";
        let lastName = fields.last_name || "";
        if (!firstName && fields.full_name) {
          const parts = fields.full_name.trim().split(/\s+/);
          firstName = parts[0] || "Unknown";
          lastName = parts.slice(1).join(" ");
        }
        if (!firstName) firstName = "Unknown";

        const email = fields.email || null;
        const phone = fields.phone_number || fields.phone || null;

        // Extra answers (e.g. custom questions) go into the note
        const extras = Object.entries(fields)
          .filter(([k]) => !["full_name", "first_name", "last_name", "email", "phone_number", "phone"].includes(k))
          .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
          .join("\n");

        const { data: newContact } = await supabase.from("contacts").insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          type: "client",
          notes: extras || null,
          created_by: brokerId,
        }).select("id").maybeSingle();

        const { data: newLead, error: leadError } = await supabase.from("leads").insert({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          source: sourceName,
          status: "new",
          broker_id: brokerId,
          source_contact_id: newContact?.id || null,
        }).select("id").single();

        if (leadError) {
          console.error("Failed to create lead:", leadError);
          results.push({ leadgen_id: leadgenId, error: leadError.message });
          continue;
        }

        await supabase.from("notes").insert({
          lead_id: newLead.id,
          content: `📣 Auto-created from a Facebook / Instagram lead ad\n${extras || ""}`.trim(),
          author_id: brokerId,
        });

        // Notify broker (best-effort)
        try {
          await fetch(`${supabaseUrl}/functions/v1/notify-new-lead`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseServiceKey}` },
            body: JSON.stringify({
              lead: { first_name: firstName, last_name: lastName, email, phone, loan_amount: null, loan_purpose: null, source: sourceName },
              broker_id: brokerId,
            }),
          });
        } catch (notifyErr) {
          console.error("Failed to notify broker:", notifyErr);
        }

        console.log("Lead created:", newLead.id, firstName, lastName);
        results.push({ leadgen_id: leadgenId, lead_id: newLead.id });
      } catch (err) {
        console.error("Error processing leadgen", leadgenId, err);
        results.push({ leadgen_id: leadgenId, error: (err as Error).message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meta lead webhook error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
