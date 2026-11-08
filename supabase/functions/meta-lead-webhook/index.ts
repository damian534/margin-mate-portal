import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { connectVerifyToken, parseMetaLead, verifyMetaSignature } from '../_shared/metaLeadRules.ts';
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const payloadSchema = z.object({ object: z.string(), entry: z.array(z.object({ id: z.string().regex(/^\d+$/), changes: z.array(z.object({ field: z.string(), value: z.object({ leadgen_id: z.union([z.string(), z.number()]).optional(), page_id: z.union([z.string(), z.number()]).optional() }).passthrough() })) })).default([]) });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const given = url.searchParams.get('hub.verify_token') ?? '';
    const accepted = [Deno.env.get('META_VERIFY_TOKEN'), await connectVerifyToken(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')].filter(Boolean);
    console.log('Facebook verification attempt', { mode: url.searchParams.get('hub.mode'), matched: accepted.includes(given) });
    if (given && url.searchParams.get('hub.mode') === 'subscribe' && accepted.includes(given)) return new Response(url.searchParams.get('hub.challenge') ?? '', { headers: corsHeaders });
    return json({ error: 'Verification failed' }, 403);
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const appSecret = Deno.env.get('META_APP_SECRET');
  const pageToken = Deno.env.get('META_PAGE_ACCESS_TOKEN');
  if (!appSecret || !pageToken) return json({ error: 'Facebook credentials are not configured' }, 503);
  const raw = await req.text();
  if (raw.length > 1000000) return json({ error: 'Payload too large' }, 413);
  if (!await verifyMetaSignature(raw, req.headers.get('x-hub-signature-256'), appSecret)) return json({ error: 'Invalid delivery signature' }, 401);
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) return json({ error: 'Invalid Facebook delivery' }, 400);
  if (parsed.data.object !== 'page') return json({ ignored: true });
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let failed = false;
  let imported = 0;
  for (const entry of parsed.data.entry) {
    const { data: page } = await db.from('meta_lead_pages').select('broker_id').eq('page_id', entry.id).eq('enabled', true).maybeSingle();
    if (!page) continue; // Unknown Pages never fall back to an arbitrary broker.
    for (const change of entry.changes) {
      if (change.field !== 'leadgen' || !change.value.leadgen_id) continue;
      if (change.value.page_id && String(change.value.page_id) !== entry.id) continue;
      const id = String(change.value.leadgen_id);
      const { data: prior } = await db.from('meta_lead_deliveries').select('status').eq('page_id', entry.id).eq('leadgen_id', id).maybeSingle();
      if (prior?.status === 'imported') continue;
      try {
        const response = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(id)}?fields=field_data,ad_name,adset_name,campaign_name,form_id`, { headers: { Authorization: `Bearer ${pageToken}` } });
        const body = await response.json();
        if (!response.ok) throw new Error(`Facebook could not retrieve this lead (${response.status}, code ${body.error?.code ?? 'unknown'}). Check Page lead access and token validity.`);
        const lead = parseMetaLead(body);
        const { data: result, error } = await db.rpc('ingest_meta_lead', { _page_id: entry.id, _leadgen_id: id, _first_name: lead.firstName, _last_name: lead.lastName, _email: lead.email, _phone: lead.phone, _custom_fields: lead.customFields, _notes: lead.notes });
        if (error) throw new Error('Could not save the Facebook lead; delivery will be retried.');
        if (!result?.duplicate) {
          imported++;
          try {
            const notification = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-new-lead`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }, body: JSON.stringify({ broker_id: page.broker_id, lead: { first_name: lead.firstName, last_name: lead.lastName, email: lead.email, phone: lead.phone, source: 'facebook_instagram_ad', loan_amount: null, loan_purpose: null } }) });
            await notification.text();
          } catch { console.error('Facebook lead saved; broker email notification failed'); }
        }
      } catch (error) {
        failed = true;
        const message = error instanceof Error ? error.message : 'Import failed';
        await db.from('meta_lead_deliveries').upsert({ page_id: entry.id, leadgen_id: id, broker_id: page.broker_id, status: 'failed', error: message }, { onConflict: 'page_id,leadgen_id', ignoreDuplicates: true });
        console.error('Facebook lead import failed:', message);
      }
    }
  }
  return json({ imported, retry_required: failed }, failed ? 503 : 200);
});
