import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface NewLeadNotification {
  lead: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    loan_amount?: number | null;
    loan_purpose?: string | null;
    source?: string | null;
  };
  broker_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as NewLeadNotification;
    const { lead, broker_id } = body;

    if (!broker_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no broker_id" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get broker email from profiles
    const { data: brokerProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", broker_id)
      .maybeSingle();

    if (!brokerProfile?.email) {
      console.log("No broker email found for", broker_id);
      return new Response(JSON.stringify({ skipped: true, reason: "no broker email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brokerName = brokerProfile.full_name || "there";
    const leadName = `${lead.first_name} ${lead.last_name}`.trim();
    const sourceLabel = lead.source?.replace(/_/g, " ") || "Unknown";

    const detailRows: string[] = [];
    if (lead.email) detailRows.push(`<tr><td style="color:#888;padding:4px 12px 4px 0;">Email</td><td style="color:#333;">${lead.email}</td></tr>`);
    if (lead.phone) detailRows.push(`<tr><td style="color:#888;padding:4px 12px 4px 0;">Phone</td><td style="color:#333;">${lead.phone}</td></tr>`);
    if (lead.loan_amount) detailRows.push(`<tr><td style="color:#888;padding:4px 12px 4px 0;">Loan Amount</td><td style="color:#333;">$${Number(lead.loan_amount).toLocaleString()}</td></tr>`);
    if (lead.loan_purpose) detailRows.push(`<tr><td style="color:#888;padding:4px 12px 4px 0;">Purpose</td><td style="color:#333;">${lead.loan_purpose}</td></tr>`);
    detailRows.push(`<tr><td style="color:#888;padding:4px 12px 4px 0;">Source</td><td style="color:#333;">${sourceLabel}</td></tr>`);

    const subject = `🆕 New Lead: ${leadName}`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
        <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${brokerName},</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6;">
          A new lead has just come through:
        </p>
        <div style="background: #f5f5f5; border-left: 4px solid #16a34a; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">${leadName}</p>
          <table style="font-size: 14px; border-collapse: collapse;">
            ${detailRows.join("")}
          </table>
        </div>
        <p style="color: #555; font-size: 14px;">Log in to your CRM to view and manage this lead.</p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">— Margin Finance</p>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Margin Notifications <notifications@margin.com.au>",
        to: [brokerProfile.email],
        subject,
        html,
      }),
    });

    const data = await res.json();
    console.log("Resend response:", { status: res.status, data });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("notify-new-lead error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
