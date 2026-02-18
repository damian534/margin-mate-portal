import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const documentId = formData.get("document_id") as string;
    const file = formData.get("file") as File;

    if (!token || !documentId || !file) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
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

    // Verify the document belongs to this lead
    const { data: docData } = await supabase
      .from("document_requests")
      .select("id")
      .eq("id", documentId)
      .eq("lead_id", tokenData.lead_id)
      .single();

    if (!docData) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload file
    const filePath = `${tokenData.lead_id}/${documentId}/${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("client-documents")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return new Response(JSON.stringify({ error: "Upload failed: " + uploadError.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update document request
    await supabase.from("document_requests").update({
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      status: "uploaded",
      uploaded_at: new Date().toISOString(),
    }).eq("id", documentId);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
