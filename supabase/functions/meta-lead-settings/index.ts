import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { canManageMeta, connectVerifyToken } from '../_shared/metaLeadRules.ts';
const schema = z.object({ action: z.enum(['status', 'connect', 'toggle', 'check']), broker_id: z.string().uuid(), page_id: z.string().regex(/^\d{1,30}$/).optional(), enabled: z.boolean().optional() });
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Sign in first' }, 401);
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return json({ error: 'Sign in first' }, 401);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return json({ error: 'Check the Facebook Page ID' }, 400);
    const input = parsed.data;
    const { data: roles } = await db.from('user_roles').select('role').eq('user_id', auth.user.id);
    if (!canManageMeta(auth.user.id, input.broker_id, (roles ?? []).map(r => r.role))) return json({ error: 'Brokerage owner access required' }, 403);
    const credentialsReady = ['META_APP_SECRET', 'META_PAGE_ACCESS_TOKEN'].every(k => !!Deno.env.get(k));
    if (input.action !== 'status') {
      if (!input.page_id) return json({ error: 'Facebook Page ID is required' }, 400);
      const { data: existing } = await db.from('meta_lead_pages').select('broker_id').eq('page_id', input.page_id).maybeSingle();
      if (existing && existing.broker_id !== input.broker_id) return json({ error: 'This Page is already connected to another brokerage' }, 409);
      if (input.action === 'connect') {
        const { error } = await db.from('meta_lead_pages').upsert({ page_id: input.page_id, broker_id: input.broker_id }, { onConflict: 'page_id', ignoreDuplicates: true });
        if (error) throw error;
      } else if (!existing) return json({ error: 'Save this Page first' }, 400);
      if (input.action === 'toggle') {
        const { error } = await db.from('meta_lead_pages').update({ enabled: input.enabled ?? false }).eq('page_id', input.page_id).eq('broker_id', input.broker_id);
        if (error) throw error;
      }
      if (input.action === 'check') {
        if (!credentialsReady) return json({ error: 'Facebook app credentials still need secure setup' }, 400);
        const headers = { Authorization: `Bearer ${Deno.env.get('META_PAGE_ACCESS_TOKEN')}` };
        const response = await fetch(`https://graph.facebook.com/v26.0/${input.page_id}?fields=id,name`, { headers });
        const page = await response.json();
        if (!response.ok) return json({ error: `Facebook Page access failed (${response.status}, code ${page.error?.code ?? 'unknown'}). Check the Page token and permissions.` }, 400);
        const subscriptionResponse = await fetch(`https://graph.facebook.com/v26.0/${input.page_id}/subscribed_apps?fields=id,subscribed_fields`, { headers });
        const subscriptions = await subscriptionResponse.json();
        if (!subscriptionResponse.ok) return json({ error: 'Page is readable, but Facebook subscription access could not be checked. Check Page management permissions.' }, 400);
        const debugResponse = await fetch('https://graph.facebook.com/v26.0/debug_token?input_token=' + encodeURIComponent(Deno.env.get('META_PAGE_ACCESS_TOKEN') ?? ''), { headers });
        const debug = await debugResponse.json();
        const appId = debug.data?.app_id;
        if (!debugResponse.ok || !debug.data?.is_valid || !appId) return json({ error: 'Facebook token validity could not be verified' }, 400);
        const subscribed = (subscriptions.data ?? []).some((a: { id: string; subscribed_fields?: string[] }) => a.id === appId && a.subscribed_fields?.includes('leadgen'));
        const leadAccess = (debug.data.scopes ?? []).includes('leads_retrieval');
        if (!subscribed || !leadAccess) return json({ error: !subscribed ? 'Subscribe this Facebook app to your Page’s leadgen events, then check again.' : 'The Page token needs leads_retrieval permission.' }, 400);
        const { error } = await db.from('meta_lead_pages').update({ page_name: page.name, verified_at: new Date().toISOString() }).eq('page_id', input.page_id).eq('broker_id', input.broker_id);
        if (error) throw error;
      }
    }
    const { data: pages, error } = await db.from('meta_lead_pages').select('*').eq('broker_id', input.broker_id).order('created_at', { ascending: false });
    if (error) throw error;
    const { data: deliveries } = await db.from('meta_lead_deliveries').select('page_id,leadgen_id,status,lead_id,error,received_at').eq('broker_id', input.broker_id).order('received_at', { ascending: false }).limit(20);
    return json({ credentials_ready: credentialsReady, verify_token: await connectVerifyToken(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''), pages: pages ?? [], deliveries: deliveries ?? [] });
  } catch { return json({ error: 'Could not update the Facebook connection' }, 500); }
});
