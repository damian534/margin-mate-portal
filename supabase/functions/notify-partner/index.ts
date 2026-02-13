import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface NotifyRequest {
  type: "note" | "status_change";
  lead: {
    first_name: string;
    last_name: string;
    referral_partner_id: string;
  };
  note_content?: string;
  old_status?: string;
  new_status?: string;
  status_label?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as NotifyRequest;
    const { type, lead } = body;

    if (!lead?.referral_partner_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "no partner" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", lead.referral_partner_id)
      .maybeSingle();

    console.log("Partner profile lookup:", { partnerId: lead.referral_partner_id, profile });

    if (!profile?.email) {
      return new Response(JSON.stringify({ skipped: true, reason: "no partner email" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const partnerName = profile.full_name || "Partner";
    const leadName = `${lead.first_name} ${lead.last_name}`;
    let subject: string;
    let html: string;

    if (type === "note") {
      subject = `Update on your referral: ${leadName}`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${partnerName},</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            There's a new update on your referral <strong>${leadName}</strong>:
          </p>
          <div style="background: #f5f5f5; border-left: 4px solid #2563eb; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; color: #333; font-size: 14px; white-space: pre-wrap;">${body.note_content}</p>
          </div>
          <p style="color: #888; font-size: 13px;">— Margin Finance</p>
        </div>
      `;
    } else {
      subject = `Referral status update: ${leadName} → ${body.status_label}`;
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 0;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Hi ${partnerName},</h2>
          <p style="color: #555; font-size: 15px; line-height: 1.6;">
            The status of your referral <strong>${leadName}</strong> has been updated:
          </p>
          <div style="text-align: center; margin: 24px 0;">
            <span style="display: inline-block; padding: 8px 20px; background: #2563eb; color: #fff; border-radius: 20px; font-size: 15px; font-weight: 600;">
              ${body.status_label}
            </span>
          </div>
          <p style="color: #888; font-size: 13px;">— Margin Finance</p>
        </div>
      `;
    }

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Margin Notifications <notifications@margin.com.au>",
        to: [profile.email],
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
    console.error("notify-partner error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
