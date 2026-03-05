import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SendFactFindRequest {
  lead_id: string;
  /** If provided, uses this token. Otherwise creates a new one. */
  token?: string;
  /** The base URL of the app (e.g. https://margin-mate-portal.lovable.app) */
  app_url: string;
}

function buildEmailHtml(clientName: string, portalUrl: string, brokerName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { padding: 32px 40px 24px; text-align: center; border-bottom: 3px solid #e63946; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a; }
    .header .brand-m { color: #e63946; }
    .body-content { padding: 32px 40px; }
    .greeting { font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 16px; }
    .body-text { font-size: 15px; line-height: 1.6; color: #4a4a4a; margin: 0 0 16px; }
    .steps { margin: 24px 0; padding: 0; }
    .step { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .step-num { background: #e63946; color: #fff; width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; margin-right: 14px; flex-shrink: 0; }
    .step-text { font-size: 14px; line-height: 1.5; color: #4a4a4a; padding-top: 3px; }
    .step-text strong { color: #1a1a1a; }
    .cta-container { text-align: center; margin: 32px 0; }
    .cta-btn { display: inline-block; background: #e63946; color: #ffffff !important; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600; letter-spacing: 0.3px; }
    .doc-section { background: #fafafa; border-radius: 8px; padding: 20px 24px; margin: 24px 0; border: 1px solid #eee; }
    .doc-section h3 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .doc-list { margin: 0; padding: 0 0 0 20px; }
    .doc-list li { font-size: 14px; line-height: 1.8; color: #4a4a4a; }
    .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #eee; }
    .footer p { font-size: 12px; color: #999; margin: 4px 0; }
    @media (max-width: 600px) {
      .header, .body-content, .footer { padding-left: 24px; padding-right: 24px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1><span class="brand-m">M</span>argin <span style="color:#e63946;">Connect</span></h1>
    </div>
    <div class="body-content">
      <p class="greeting">Hi ${clientName},</p>
      <p class="body-text">
        Welcome to Margin Finance! We're excited to help you with your lending journey.
        To get started, we need to collect some important information via our secure online Fact Find form.
      </p>

      <p class="body-text" style="font-weight:600; color:#1a1a1a;">Here's what to expect:</p>

      <div class="steps">
        <div class="step">
          <span class="step-num">1</span>
          <span class="step-text"><strong>Click the button below</strong> to open your secure client portal.</span>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <span class="step-text"><strong>Complete the Fact Find form</strong> — it covers your personal details, employment, income, assets, liabilities, and expenses. Allow around 20–30 minutes.</span>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <span class="step-text"><strong>Upload your supporting documents</strong> — payslips, bank statements, ID, and any other documents your broker requests.</span>
        </div>
        <div class="step">
          <span class="step-num">4</span>
          <span class="step-text"><strong>Your broker will review</strong> everything and be in touch to discuss next steps.</span>
        </div>
      </div>

      <div class="cta-container">
        <a href="${portalUrl}" class="cta-btn">Open My Fact Find</a>
      </div>

      <div class="doc-section">
        <h3>📄 Documents you may need handy:</h3>
        <ul class="doc-list">
          <li>Photo ID (driver's licence or passport)</li>
          <li>Last 2 payslips (or tax returns if self-employed)</li>
          <li>Recent bank statements (savings & transaction accounts)</li>
          <li>Details of existing loans or credit cards</li>
          <li>Contract of sale (if purchasing)</li>
          <li>Council rates notice (for owned properties)</li>
        </ul>
      </div>

      <p class="body-text">
        If you have any questions or need help completing the form, don't hesitate to reach out to your broker${brokerName ? `, ${brokerName}` : ''}.
      </p>
      <p class="body-text">
        This link is unique to you — please do not share it with others.
      </p>
    </div>
    <div class="footer">
      <p>Margin Finance — Making every connection count</p>
      <p>This is an automated message. Please contact your broker directly for assistance.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { lead_id, app_url } = (await req.json()) as SendFactFindRequest;

    if (!lead_id || !app_url) {
      return new Response(
        JSON.stringify({ error: "lead_id and app_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch lead (using admin to bypass RLS for service operations)
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("leads")
      .select("id, first_name, last_name, email, broker_id")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadErr || !lead) {
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!lead.email) {
      return new Response(
        JSON.stringify({ error: "Lead does not have an email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create portal token
    let portalToken: string;

    // Check for existing active token
    const { data: existingToken } = await supabaseAdmin
      .from("client_portal_tokens")
      .select("token")
      .eq("lead_id", lead_id)
      .eq("is_active", true)
      .maybeSingle();

    if (existingToken?.token) {
      portalToken = existingToken.token;
    } else {
      // Create new token
      const { data: newToken, error: tokenErr } = await supabaseAdmin
        .from("client_portal_tokens")
        .insert({
          lead_id,
          created_by: userId,
          is_active: true,
        })
        .select("token")
        .maybeSingle();

      if (tokenErr || !newToken) {
        console.error("Failed to create portal token:", tokenErr);
        return new Response(
          JSON.stringify({ error: "Failed to create portal token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      portalToken = newToken.token;
    }

    // Get broker name
    let brokerName = "";
    if (lead.broker_id) {
      const { data: brokerProfile } = await supabaseAdmin
        .from("profiles")
        .select("full_name")
        .eq("user_id", lead.broker_id)
        .maybeSingle();
      brokerName = brokerProfile?.full_name || "";
    }

    // Build portal URL
    const portalUrl = `${app_url.replace(/\/$/, "")}/client-portal?token=${encodeURIComponent(portalToken)}`;

    // Build and send email
    const clientName = `${lead.first_name} ${lead.last_name || ""}`.trim();
    const html = buildEmailHtml(clientName, portalUrl, brokerName);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Margin Finance <notifications@margin.com.au>",
        to: [lead.email],
        subject: `${clientName} — Your Margin Finance Fact Find is ready`,
        html,
      }),
    });

    const emailData = await emailRes.json();

    if (!emailRes.ok) {
      console.error("Resend error:", emailData);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: emailData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fact find email sent to ${lead.email} for lead ${lead_id}`);

    return new Response(
      JSON.stringify({ success: true, email_id: emailData.id, portal_url: portalUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-fact-find error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
