import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { validLegal, validConsent, creditText } from '../_shared/factFindRules.ts';

const answerSchema = z.object({ privacy: z.boolean().optional(), credit: z.boolean().optional(), typed_name: z.string().max(200).optional(), first_name: z.string().max(100).optional(), last_name: z.string().max(100).optional(), email: z.union([z.string().email().max(254), z.literal('')]).optional(), phone: z.string().max(30).optional() }).strict();
const requestSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('load'), token: z.string().regex(/^[a-f0-9]{64}$/) }),
  z.object({ action: z.literal('save'), token: z.string().regex(/^[a-f0-9]{64}$/), revision: z.number().int().nonnegative(), step: z.number().int().min(0).max(2), answers: answerSchema }),
  z.object({ action: z.literal('consent'), token: z.string().regex(/^[a-f0-9]{64}$/), answers: answerSchema, version: z.string().min(1).max(100) }),
  z.object({ action: z.literal('create'), deal_id: z.string().uuid() }),
  z.object({ action: z.literal('link'), applicant_id: z.string().uuid() }),
  z.object({ action: z.literal('settings'), business_name: z.string().trim().min(1).max(200), privacy_url: z.string().url().max(2000).startsWith('https://'), credit_guide_url: z.string().url().max(2000).startsWith('https://'), privacy_version: z.string().trim().min(1).max(100), privacy_summary: z.string().trim().min(20).max(5000), approved: z.boolean() }),
]);
const hash = async (token: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))).map(b => b.toString(16).padStart(2, '0')).join('');
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
Deno.serve(async req => {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Use POST' }, 405);
  try {
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: 'Please check your answers.' }, 400);
    const body = parsed.data;
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'); const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !key || !anon) return reply({ error: 'Service unavailable' }, 503);
    const db = createClient(url, key);
    const check = (result: { error: unknown }) => { if (result.error) throw new Error('Could not save your information. Please try again.'); };
    if ('token' in body) {
      const { data: link } = await db.from('fact_find_links').select('applicant_id,expires_at,revoked_at').eq('token_hash', await hash(body.token)).maybeSingle();
      if (!link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now()) return reply({ error: 'This link is invalid or has expired. Please ask your broker for a new link.' }, 403);
      const { data: applicant } = await db.from('fact_find_applicants').select('*').eq('id', link.applicant_id).single();
      if (!applicant) return reply({ error: 'Applicant not found' }, 404);
      const { data: find } = await db.from('fact_finds').select('*').eq('id', applicant.fact_find_id).single();
      if (!find) return reply({ error: 'Fact find not found' }, 404);
      const { data: legal } = await db.from('fact_find_settings').select('*').eq('broker_id', find.broker_id).maybeSingle();
      const { data: consent } = await db.from('fact_find_consents').select('typed_name,accepted_at,privacy_version').eq('applicant_id', applicant.id).maybeSingle();
      if (body.action === 'load') return reply({ applicant: { id: applicant.id, name: applicant.name, answers: applicant.answers, current_step: applicant.current_step, revision: applicant.revision }, legal, consent, ready: validLegal(legal), status: find.status });
      if (find.status === 'submitted') return reply({ error: 'This fact find has already been submitted.' }, 409);
      if (body.action === 'consent') {
        if (!validLegal(legal)) return reply({ error: 'Your broker needs to confirm the privacy documents first.' }, 409);
        if (!validConsent(body.answers)) return reply({ error: 'Tick both boxes and enter your full name.' }, 400);
        if (body.version !== legal.privacy_version) return reply({ error: 'The privacy documents changed. Please reload and review them.' }, 409);
        if (!consent) {
          const result = await db.from('fact_find_consents').insert({ applicant_id: applicant.id, typed_name: body.answers.typed_name?.trim(), privacy_version: legal.privacy_version, privacy_text: `${legal.privacy_summary}\nI’ve read and accept the Privacy Policy and Credit Guide.\n${creditText(legal.business_name)}`, privacy_url: legal.privacy_url, credit_guide_url: legal.credit_guide_url, privacy_accepted: true, credit_accepted: true, ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('cf-connecting-ip') || null, user_agent: (req.headers.get('user-agent') ?? '').slice(0, 2000) });
          if (result.error && result.error.code !== '23505') check(result);
        }
        check(await db.from('fact_finds').update({ status: 'in_progress', progress_pct: 5 }).eq('id', find.id).neq('status', 'submitted'));
        return reply({ ok: true });
      }
      if (body.step > 0 && !consent) return reply({ error: 'Consent is required before continuing.' }, 400);
      // Accepted evidence is immutable; draft checkbox changes cannot change it.
      const { data: saved, error } = await db.rpc('fact_find_save_draft', { _applicant_id: applicant.id, _revision: body.revision, _answers: body.answers, _step: body.step });
      check({ error });
      if (!saved) return reply({ error: 'This link was edited on another device. Reload to get the latest answers.' }, 409);
      return reply({ ok: true, revision: body.revision + 1 });
    }
    const auth = req.headers.get('Authorization');
    if (!auth) return reply({ error: 'Please sign in.' }, 401);
    const caller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return reply({ error: 'Please sign in.' }, 401);
    const { data: roles } = await caller.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some(r => ['broker', 'broker_staff', 'super_admin'].includes(r.role))) return reply({ error: 'Broker access required.' }, 403);
    const { data: brokerId } = await caller.rpc('get_my_broker_id', { _user_id: user.id });
    if (!brokerId) return reply({ error: 'Brokerage not found.' }, 403);
    if (body.action === 'settings') {
      if (!roles.some(r => ['broker', 'super_admin'].includes(r.role))) return reply({ error: 'Only the broker can approve legal documents.' }, 403);
      const { action, ...settings } = body;
      check(await db.from('fact_find_settings').upsert({ ...settings, broker_id: brokerId, updated_at: new Date().toISOString() }));
      return reply({ ok: true });
    }
    let applicantId: string;
    if (body.action === 'create') {
      const { data: allowed } = await caller.rpc('can_manage_lead', { _lead_id: body.deal_id });
      if (!allowed) return reply({ error: 'You cannot access this deal.' }, 403);
      const { data: lead } = await caller.from('leads').select('id,broker_id,first_name,last_name,email,phone').eq('id', body.deal_id).single();
      if (!lead) return reply({ error: 'Deal not found.' }, 404);
      let { data: find } = await db.from('fact_finds').select('id').eq('deal_id', lead.id).maybeSingle();
      if (!find) { const result = await db.from('fact_finds').upsert({ deal_id: lead.id, broker_id: lead.broker_id }, { onConflict: 'deal_id', ignoreDuplicates: true }); check(result); const loaded = await db.from('fact_finds').select('id').eq('deal_id', lead.id).single(); find = loaded.data; }
      if (!find) throw new Error('Could not create fact find.');
      const { data: existing } = await db.from('fact_find_applicants').select('id').eq('fact_find_id', find.id).order('display_order');
      if (!existing?.length) {
        const { data: savedApplicants } = await caller.from('lead_applicants').select('id,name,email,phone').eq('lead_id', lead.id).order('display_order');
        const people = [{ id: null, name: `${lead.first_name} ${lead.last_name}`.trim(), email: lead.email ?? '', phone: lead.phone ?? '' }, ...(savedApplicants ?? [])];
        const seen = new Set<string>(); const unique = people.filter(person => { const identity = person.name.trim().toLowerCase(); if (seen.has(identity)) return false; seen.add(identity); return true; });
        check(await db.from('fact_find_applicants').upsert(unique.map((person, index) => ({ fact_find_id: find.id, source_applicant_id: person.id, name: person.name, email: person.email ?? '', phone: person.phone ?? '', display_order: index, answers: { first_name: person.name.split(' ')[0] ?? '', last_name: person.name.split(' ').slice(1).join(' '), email: person.email ?? '', phone: person.phone ?? '' } })), { onConflict: 'fact_find_id,display_order', ignoreDuplicates: true }));
      }
      return reply({ ok: true, id: find.id });
    } else {
      const { data: applicant } = await caller.from('fact_find_applicants').select('id').eq('id', body.applicant_id).maybeSingle();
      if (!applicant) return reply({ error: 'You cannot access this applicant.' }, 403);
      applicantId = applicant.id;
    }
    const token = randomToken();
    check(await db.from('fact_find_links').insert({ applicant_id: applicantId, token_hash: await hash(token) }));
    return reply({ ok: true, token });
  } catch (error) { return reply({ error: error instanceof Error ? error.message : 'Please try again.' }, 500); }
});