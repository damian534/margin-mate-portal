import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_docs/v1";

function extractDocId(input: string): string | null {
  if (!input) return null;
  const m = input.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return null;
}

function extractText(doc: any): string {
  const out: string[] = [];
  const content = doc?.body?.content ?? [];
  for (const el of content) {
    const para = el.paragraph;
    if (!para) continue;
    const heading = para.paragraphStyle?.namedStyleType ?? "";
    let line = "";
    for (const e of para.elements ?? []) {
      const tr = e.textRun;
      if (tr?.content) line += tr.content;
    }
    line = line.replace(/\n+$/, "");
    if (!line.trim()) { out.push(""); continue; }
    if (heading.startsWith("HEADING_1") || heading === "TITLE") out.push(`# ${line}`);
    else if (heading.startsWith("HEADING_2")) out.push(`## ${line}`);
    else if (heading.startsWith("HEADING_3")) out.push(`### ${line}`);
    else out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const gdocsKey = Deno.env.get("GOOGLE_DOCS_API_KEY");
    if (!lovableKey) return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!gdocsKey) return new Response(JSON.stringify({ error: "Google Docs is not connected" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const leadId = body.lead_id as string;
    const url = (body.url as string) || "";
    const noteLabel = (body.label as string) || "Meeting summary";
    if (!leadId) return new Response(JSON.stringify({ error: "lead_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const docId = extractDocId(url);
    if (!docId) return new Response(JSON.stringify({ error: "Could not parse Google Doc URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const resp = await fetch(`${GATEWAY_URL}/documents/${docId}`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": gdocsKey },
    });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Google Docs fetch failed [${resp.status}]`, detail: t.slice(0, 400) }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const doc = await resp.json();
    const title = doc.title || "Untitled doc";
    const text = extractText(doc);
    if (!text) return new Response(JSON.stringify({ error: "Document is empty" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
    const content = `📄 ${noteLabel}: ${title}\n${docUrl}\n\n${text}`;

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: insErr } = await admin.from("notes").insert({
      lead_id: leadId,
      author_id: user.id,
      content,
      notify_partner: false,
    } as any);
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, title, length: text.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("import-google-doc error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});