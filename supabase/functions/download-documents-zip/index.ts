import { createClient } from 'npm:@supabase/supabase-js@2';
import JSZip from 'npm:jszip@3.10.1';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const jsonResponse = (body: Record<string, unknown>, status: number) => new Response(
  JSON.stringify(body),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
      console.error('Missing required backend environment variables');
      return jsonResponse({ error: 'Document download is temporarily unavailable' }, 500);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || token === authHeader) {
      return jsonResponse({ error: 'Not authenticated' }, 401);
    }

    const body = await req.json().catch(() => null) as { leadId?: unknown } | null;
    const leadId = typeof body?.leadId === 'string' ? body.leadId : '';
    if (!UUID_PATTERN.test(leadId)) {
      return jsonResponse({ error: 'A valid deal is required' }, 400);
    }

    // Authenticate the JWT first, then explicitly resolve every supported access path.
    // This avoids staff downloads depending on browser-facing RLS evaluation.
    const authClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user) return jsonResponse({ error: 'Your session has expired. Please sign in again.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: lead, error: leadErr } = await admin
      .from('leads')
      .select('id, first_name, last_name, opportunity_name, broker_id, original_broker_id, referral_partner_id')
      .eq('id', leadId)
      .maybeSingle();

    if (leadErr || !lead) return jsonResponse({ error: 'Deal not found' }, 404);

    const [{ data: roleRows }, { data: profile }, { data: referral }] = await Promise.all([
      admin.from('user_roles').select('role').eq('user_id', user.id),
      admin.from('profiles').select('broker_id, company_id, is_director').eq('user_id', user.id).maybeSingle(),
      admin.from('lead_referrals').select('id').eq('lead_id', leadId).eq('to_broker_id', user.id).in('status', ['pending', 'accepted']).limit(1).maybeSingle(),
    ]);

    const roles = new Set((roleRows ?? []).map((row: { role: string }) => row.role));
    let canAccess = roles.has('super_admin')
      || (roles.has('broker') && lead.broker_id === user.id)
      || (roles.has('broker_staff') && Boolean(profile?.broker_id) && lead.broker_id === profile?.broker_id)
      || lead.referral_partner_id === user.id
      || lead.original_broker_id === user.id
      || Boolean(referral);

    if (!canAccess && lead.referral_partner_id && (roles.has('broker') || roles.has('broker_staff'))) {
      const tenantBrokerId = roles.has('broker_staff') ? profile?.broker_id : user.id;
      const { data: partner } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', lead.referral_partner_id)
        .eq('broker_id', tenantBrokerId ?? '')
        .maybeSingle();
      canAccess = Boolean(partner) && (!lead.broker_id || lead.broker_id === tenantBrokerId);
    }

    if (!canAccess && profile?.is_director && profile.company_id && lead.referral_partner_id) {
      const { data: companyPartner } = await admin
        .from('profiles')
        .select('id')
        .eq('user_id', lead.referral_partner_id)
        .eq('company_id', profile.company_id)
        .maybeSingle();
      canAccess = Boolean(companyPartner);
    }

    if (!canAccess) {
      console.warn('ZIP access denied', { userId: user.id, leadId, roles: [...roles] });
      return jsonResponse({ error: 'You do not have access to this deal' }, 403);
    }

    // 2. Collect every uploaded file with elevated privileges (storage RLS bypassed).
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

    type Entry = { path: string; name: string };
    const entries: Entry[] = [];
    for (const r of requests as any[]) {
      const own = extra.filter((f) => f.document_request_id === r.id);
      if (own.length) {
        own.forEach((f) => entries.push({ path: f.file_path, name: f.file_name || 'document' }));
      } else if (r.file_path) {
        entries.push({ path: r.file_path, name: r.file_name || 'document' });
      }
    }

    if (!entries.length) {
      return jsonResponse({ error: 'No uploaded documents to download' }, 404);
    }

    const zip = new JSZip();
    const used = new Set<string>();
    const failed: string[] = [];

    for (const e of entries) {
      const { data, error } = await admin.storage.from('client-documents').download(e.path);
      if (error || !data) { failed.push(e.name); continue; }
      const safeName = e.name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'document';
      const dot = safeName.lastIndexOf('.');
      const base = dot > 0 ? safeName.slice(0, dot) : safeName;
      const ext = dot > 0 ? safeName.slice(dot) : '';
      let candidate = safeName;
      let i = 2;
      while (used.has(candidate)) { candidate = `${base} (${i})${ext}`; i++; }
      used.add(candidate);
      zip.file(candidate, new Uint8Array(await data.arrayBuffer()));
    }

    if (!used.size) {
      return jsonResponse({ error: 'Could not read any stored files' }, 500);
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
    return jsonResponse({ error: e instanceof Error ? e.message : 'Unexpected download error' }, 500);
  }
});
