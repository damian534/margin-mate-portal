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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claims.claims.sub;
    const { data: roleData } = await anonClient
      .from("user_roles").select("role").eq("user_id", callerUserId).maybeSingle();
    if (roleData?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId: string | null = body.userId ?? null;
    const profileId: string | null = body.profileId ?? null;
    const reassignToId: string | null = body.reassignToId ?? null;

    if (!userId && !profileId) {
      return new Response(JSON.stringify({ error: "userId or profileId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userId && userId === callerUserId) {
      return new Response(JSON.stringify({ error: "You cannot remove your own account" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (userId) {
      // Count open work
      const { count: openTaskCount } = await admin
        .from("tasks").select("id", { count: "exact", head: true })
        .eq("assigned_to", userId).eq("completed", false);
      const { count: assignedLeadCount } = await admin
        .from("leads").select("id", { count: "exact", head: true })
        .eq("assigned_to", userId);
      const { count: ownedLeadCount } = await admin
        .from("leads").select("id", { count: "exact", head: true })
        .eq("broker_id", userId);

      const totalToReassign = (openTaskCount || 0) + (assignedLeadCount || 0) + (ownedLeadCount || 0);

      if (totalToReassign > 0 && !reassignToId) {
        return new Response(JSON.stringify({
          error: "reassignment_required",
          openTaskCount: openTaskCount || 0,
          assignedLeadCount: assignedLeadCount || 0,
          ownedLeadCount: ownedLeadCount || 0,
        }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (reassignToId) {
        // Reassign open tasks
        const { error: tErr } = await admin.from("tasks")
          .update({ assigned_to: reassignToId })
          .eq("assigned_to", userId).eq("completed", false);
        if (tErr) throw tErr;
        // Reassign leads where they are the assignee
        const { error: lErr } = await admin.from("leads")
          .update({ assigned_to: reassignToId })
          .eq("assigned_to", userId);
        if (lErr) throw lErr;
        // Reassign leads where they are the broker owner
        const { error: bErr } = await admin.from("leads")
          .update({ broker_id: reassignToId })
          .eq("broker_id", userId);
        if (bErr) throw bErr;
      }

      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("user_id", userId);
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);
      if (delErr) {
        return new Response(JSON.stringify({ error: delErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (profileId) {
      // Placeholder profile with no auth user
      await admin.from("profiles").delete().eq("id", profileId);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});