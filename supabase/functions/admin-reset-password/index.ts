import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user is a super_admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claims, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claims.claims.sub;

    // Check caller is super_admin
    const { data: roleData } = await anonClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .maybeSingle();

    if (roleData?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client to generate the reset link
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the origin from the referer or use a default
    const referer = req.headers.get("referer") || req.headers.get("origin") || "";
    const origin = referer ? new URL(referer).origin : "";
    const redirectTo = `${origin}/reset-password`;

    // Generate a recovery link via the admin API (does not auto-send an email)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: linkError?.message || "Failed to generate reset link" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actionLink = linkData.properties.action_link;

    // Look up the user's name for a friendlier email
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    const fullName = profile?.full_name || "there";

    // Send a branded email via the existing Resend-backed send-email function
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset your Margin Finance password</h2>
        <p>Hi ${fullName},</p>
        <p>A password reset has been requested for your Margin Finance account. Click below to set a new password.</p>
        <div style="margin: 24px 0;">
          <a href="${actionLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Or copy this link into your browser:<br/><a href="${actionLink}">${actionLink}</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 32px;">If you didn't request this, you can safely ignore this email. The link expires in 1 hour.</p>
      </div>
    `;

    let emailSent = true;
    let emailError: string | null = null;
    try {
      const sendRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          to: email,
          subject: "Reset your Margin Finance password",
          html,
        }),
      });
      if (!sendRes.ok) {
        emailSent = false;
        emailError = await sendRes.text();
      }
    } catch (e) {
      emailSent = false;
      emailError = (e as Error).message;
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
        email_error: emailError,
        action_link: actionLink,
        message: emailSent
          ? `Password reset email sent to ${email}`
          : `Generated reset link (email delivery failed — share the link manually)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
