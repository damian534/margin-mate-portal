import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create user client to get the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to bypass RLS
    const admin = createClient(supabaseUrl, serviceKey);

    // Get the user's profile to find their company
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id, company_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return new Response(
        JSON.stringify({ leaderboard: [], myStats: null, companyName: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all agents in the same company
    const { data: agents } = await admin
      .from("profiles")
      .select("id, user_id, full_name")
      .eq("company_id", profile.company_id);

    if (!agents || agents.length === 0) {
      return new Response(
        JSON.stringify({ leaderboard: [], myStats: null, companyName: profile.company_name }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentUserIds = agents.filter((a) => a.user_id).map((a) => a.user_id);

    // Get all leads for these agents (only summary data needed)
    const { data: leads } = await admin
      .from("leads")
      .select("referral_partner_id, loan_amount, status, created_at")
      .in("referral_partner_id", agentUserIds);

    const allLeads = leads || [];

    // Build leaderboard entries
    const leaderboard = agents
      .filter((a) => a.user_id)
      .map((agent) => {
        const agentLeads = allLeads.filter((l) => l.referral_partner_id === agent.user_id);
        const settledLeads = agentLeads.filter((l) => l.status === "settled");
        const loanVolume = settledLeads.reduce((s, l) => s + (l.loan_amount || 0), 0);
        return {
          user_id: agent.user_id,
          name: agent.full_name || "Unnamed",
          leads_count: agentLeads.length,
          settled_count: settledLeads.length,
          loan_volume: loanVolume,
          score: agentLeads.length + settledLeads.length * 3 + loanVolume / 100000,
          lead_dates: agentLeads.map((l) => l.created_at),
        };
      })
      .sort((a, b) => b.score - a.score);

    // Find current user's entry
    const myEntry = leaderboard.find((e) => e.user_id === user.id);
    const myRank = myEntry ? leaderboard.indexOf(myEntry) + 1 : null;

    return new Response(
      JSON.stringify({
        leaderboard,
        myRank,
        totalAgents: leaderboard.length,
        companyName: profile.company_name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
