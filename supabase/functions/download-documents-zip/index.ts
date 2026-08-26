import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { leadId } = await req.json();
    if (!leadId) {
      return new Response(JSON.stringify({ error: 'leadId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Authorise: the caller must be able to see this lead under RLS.
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: lead, error: leadErr } = await userClient
      .from('leads')
      .select('id, first_name, last_name, opportunity_name')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) {
      return new Response(JSON.stringify({ error: 'You do not have access to this deal' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Collect every uploaded file with elevated privileges (storage RLS bypassed).
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: reqs } = await admin
      .from('document_requests')
      .select('id, name, file_path, file_name')
      .eq('lead_id', leadId);

    const requests = reqs ?? [];
    const ids = requests.map((r: any) => r.id);
    let extra: any[] = [];
    if (ids.length) {
      const { data } = await admin
        .from('document_request_files')
        .select('document_request_id, file_path, file_name')
        .in('document_request_id', ids);
      extra = data ?? [];
    }

    type Entry = { path: string; name: string; label: string };
    const entries: Entry[] = [];
    for (const r of requests as any[]) {
      const own = extra.filter((f) => f.document_request_id === r.id);
      if (own.length) {
        own.forEach((f) => entries.push({ path: f.file_path, name: f.file_name || 'document', label: r.name }));
      } else if (r.file_path) {
        entries.push({ path: r.file_path, name: r.file_name || 'document', label: r.name });
      }
    }

    if (!entries.length) {
      return new Response(JSON.stringify({ error: 'No uploaded documents to download' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const zip = new JSZip();
    const used = new Set<string>();
    const failed: string[] = [];

    for (const e of entries) {
      const { data, error } = await admin.storage.from('client-documents').download(e.path);
      if (error || !data) { failed.push(e.name); continue; }
      const folder = e.label ? `${e.label.replace(/[\\/:*?"<>|]/g, '-')}/` : '';
      const dot = e.name.lastIndexOf('.');
      const base = dot > 0 ? e.name.slice(0, dot) : e.name;
      const ext = dot > 0 ? e.name.slice(dot) : '';
      let candidate = `${folder}${e.name}`;
      let i = 2;
      while (used.has(candidate)) { candidate = `${folder}${base} (${i})${ext}`; i++; }
      used.add(candidate);
      zip.file(candidate, new Uint8Array(await data.arrayBuffer()));
    }

    if (!used.size) {
      return new Response(JSON.stringify({ error: 'Could not read any stored files' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bytes: Uint8Array = await zip.generateAsync({ type: 'uint8array' });
    const clientName = `${(lead as any).first_name ?? ''} ${(lead as any).last_name ?? ''}`.trim() || 'client';
    const fileName = `${clientName.replace(/[^a-z0-9]+/gi, '_')}_documents.zip`;

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Zip-File-Count': String(used.size),
        'X-Zip-Failed-Count': String(failed.length),
      },
    });
  } catch (e) {
    console.error('download-documents-zip error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
