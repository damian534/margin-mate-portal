import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    let emailBody = "";
    let senderEmail = "";
    let subject = "";

    // Mailgun sends multipart/form-data for inbound emails
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData();
      emailBody = (formData.get("body-plain") as string) || (formData.get("stripped-text") as string) || "";
      senderEmail = (formData.get("sender") as string) || (formData.get("from") as string) || "";
      subject = (formData.get("subject") as string) || "";
      console.log("Mailgun inbound — from:", senderEmail, "subject:", subject);
    } else {
      // JSON fallback (for testing or other webhook providers)
      const json = await req.json();
      emailBody = json.body || json["body-plain"] || json.text || json.content || "";
      senderEmail = json.sender || json.from || json.email || "";
      subject = json.subject || "";
      console.log("JSON inbound — from:", senderEmail, "subject:", subject);
    }

    if (!emailBody && !subject) {
      return new Response(JSON.stringify({ error: "No email content received" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to extract lead details from the email
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an email parser for a mortgage broker CRM. Extract lead details from forwarded enquiry emails. 
You MUST call the extract_lead function with the extracted data. Extract as much as you can from the email.
For loan_purpose, map to one of: "first_home", "refinance", "next_home", "investment", or null if unclear.
For the name, try to extract first and last name separately. If you can only find one name, put it as first_name.
If the email was forwarded, the actual lead's details are in the forwarded content, not the forwarder's details.`,
          },
          {
            role: "user",
            content: `Subject: ${subject}\nFrom: ${senderEmail}\n\nEmail body:\n${emailBody}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lead",
              description: "Extract lead details from an email enquiry",
              parameters: {
                type: "object",
                properties: {
                  first_name: { type: "string", description: "Lead's first name" },
                  last_name: { type: "string", description: "Lead's last name" },
                  email: { type: "string", description: "Lead's email address" },
                  phone: { type: "string", description: "Lead's phone number" },
                  loan_amount: { type: "number", description: "Requested loan amount if mentioned" },
                  loan_purpose: { type: "string", enum: ["first_home", "refinance", "next_home", "investment"], description: "Purpose of the loan" },
                  notes: { type: "string", description: "Any additional context or details from the email" },
                },
                required: ["first_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lead" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI parsing failed [${aiResponse.status}]`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiData));
      throw new Error("AI did not return structured lead data");
    }

    const lead = JSON.parse(toolCall.function.arguments);
    console.log("Extracted lead:", JSON.stringify(lead));

    // Create the lead in the database using service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the first broker to assign the lead to
    const { data: brokerRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["broker", "super_admin"])
      .limit(1)
      .single();

    const brokerId = brokerRole?.user_id || null;

    // Insert the lead
    const { data: newLead, error: leadError } = await supabase.from("leads").insert({
      first_name: lead.first_name || "Unknown",
      last_name: lead.last_name || "",
      email: lead.email || null,
      phone: lead.phone || null,
      loan_amount: lead.loan_amount || null,
      loan_purpose: lead.loan_purpose || null,
      source: "website",
      status: "new",
      broker_id: brokerId,
    }).select("id").single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      throw new Error(`Database error: ${leadError.message}`);
    }

    // Also create a contact record
    await supabase.from("contacts").insert({
      first_name: lead.first_name || "Unknown",
      last_name: lead.last_name || "",
      email: lead.email || null,
      phone: lead.phone || null,
      type: "client",
      notes: lead.notes || null,
      created_by: brokerId,
    });

    // Add a note with the original email content
    if (newLead?.id) {
      await supabase.from("notes").insert({
        lead_id: newLead.id,
        content: `📧 Auto-created from email\nSubject: ${subject}\n\n${lead.notes || emailBody.slice(0, 500)}`,
        author_id: brokerId,
      });
    }

    console.log("Lead created successfully:", newLead?.id);

    return new Response(JSON.stringify({ success: true, lead_id: newLead?.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Inbound lead error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
