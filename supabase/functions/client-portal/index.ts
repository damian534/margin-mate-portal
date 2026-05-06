import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from("client_portal_tokens")
        .select("lead_id, is_active, expires_at")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!tokenData.is_active) {
        return new Response(JSON.stringify({ error: "This link has been deactivated" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This link has expired" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get lead info
      const { data: lead } = await supabase
        .from("leads")
        .select("first_name, last_name, email, phone")
        .eq("id", tokenData.lead_id)
        .single();

      // Get fact find data
      const { data: factFind } = await supabase
        .from("fact_find_responses")
        .select("section, data, completed")
        .eq("lead_id", tokenData.lead_id);

      // Get document requests
      const { data: documents } = await supabase
        .from("document_requests")
        .select("id, name, description, status, file_name, rejection_reason")
        .eq("lead_id", tokenData.lead_id)
        .not("requested_at", "is", null)
        .order("created_at", { ascending: true });

      return new Response(JSON.stringify({
        lead_id: tokenData.lead_id,
        lead_name: lead ? `${lead.first_name} ${lead.last_name}` : "Client",
        lead_email: lead?.email || "",
        lead_phone: lead?.phone || "",
        fact_find: factFind || [],
        documents: documents || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { token, action } = body;

      if (!token) {
        return new Response(JSON.stringify({ error: "Missing token" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token
      const { data: tokenData } = await supabase
        .from("client_portal_tokens")
        .select("lead_id, is_active, expires_at")
        .eq("token", token)
        .single();

      if (!tokenData || !tokenData.is_active) {
        return new Response(JSON.stringify({ error: "Invalid or expired link" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This link has expired" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "save_fact_find") {
        const { section, data, completed } = body;
        const { error } = await supabase
          .from("fact_find_responses")
          .upsert({
            lead_id: tokenData.lead_id,
            section,
            data,
            completed,
            updated_by: "client",
          }, { onConflict: "lead_id,section" });

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
