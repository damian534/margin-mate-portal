import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { normalizeSmsPhone, newLeadSms } from './rules.ts';
import { twilioSendError } from '../_shared/twilioErrors.ts';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const schema = z.union([
  z.object({ job_id: z.string().uuid(), dispatch_token: z.string().uuid() }),
  z.object({ action: z.enum(['save', 'test']), broker_id: z.string().uuid(), enabled: z.boolean().optional(), phone: z.string().max(40).optional(), sender: z.string().max(40).optional() }),
]);
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let jobId: string | undefined;
  try {
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: 'Invalid SMS request' }, 400);
    const input = parsed.data;
    let brokerId: string;
    let message = 'Connect: Your new-lead SMS alerts are ready.';
    if ('job_id' in input) {
      // One-use, service-only capability: claim atomically before spending on SMS.
      const { data: job, error } = await db.from('lead_sms_jobs').update({ status: 'sending' })
        .eq('id', input.job_id).eq('dispatch_token', input.dispatch_token).eq('status', 'pending')
        .select('id,lead_id,broker_id').maybeSingle();
      if (error) throw error;
      if (!job) return json({ error: 'Invalid or already processed SMS event' }, 401);
      jobId = job.id;
      brokerId = job.broker_id;
      const { data: lead, error: leadError } = await db.from('leads').select('id,first_name,last_name').eq('id', job.lead_id).eq('broker_id', brokerId).single();
      if (leadError || !lead) throw new Error('Lead not available');
      message = newLeadSms(lead);
    } else {
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: 'Sign in to manage SMS alerts' }, 401);
      const { data: auth, error } = await db.auth.getUser(token);
      if (error || !auth.user) return json({ error: 'Sign in to manage SMS alerts' }, 401);
      const { data: roles } = await db.from('user_roles').select('role').eq('user_id', auth.user.id);
      const superAdmin = roles?.some(r => r.role === 'super_admin');
      const broker = roles?.some(r => r.role === 'broker');
      if (!superAdmin && (!broker || input.broker_id !== auth.user.id)) return json({ error: 'Only the broker or administrator can manage SMS alerts' }, 403);
      brokerId = input.broker_id;
      if (input.action === 'save') {
        const phone = normalizeSmsPhone(input.phone ?? '');
        const sender = normalizeSmsPhone(input.sender ?? '');
        if (input.enabled && (!phone || !sender)) return json({ error: 'Enter your mobile and a Twilio sending number with country code' }, 400);
        if ((input.phone && !phone) || (input.sender && !sender)) return json({ error: 'Use an Australian mobile or a number with country code, such as +61' }, 400);
        const { error: saveError } = await db.from('broker_email_settings').upsert({ broker_id: brokerId, sms_alerts_enabled: input.enabled ?? false, sms_alert_phone: phone, sms_sender_phone: sender }, { onConflict: 'broker_id' });
        if (saveError) throw saveError;
        return json({ ok: true });
      }
    }
    const { data: settings, error: settingsError } = await db.from('broker_email_settings').select('sms_alerts_enabled,sms_alert_phone,sms_sender_phone').eq('broker_id', brokerId).single();
    if (settingsError) throw settingsError;
    if (jobId && !settings.sms_alerts_enabled) {
      await db.from('lead_sms_jobs').update({ status: 'skipped', processed_at: new Date().toISOString() }).eq('id', jobId);
      return json({ ok: true, skipped: true });
    }
    const to = normalizeSmsPhone(settings.sms_alert_phone ?? '');
    const from = normalizeSmsPhone(settings.sms_sender_phone ?? '');
    if (!to || !from) throw new Error('Save a recipient mobile and Twilio sending number first');
    const key = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('TWILIO_API_KEY');
    if (!key || !connectionKey) throw new Error('Twilio connection is not configured');
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'X-Connection-Api-Key': connectionKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: message }),
    });
    if (!response.ok) {
      const details = await response.text();
      console.error(`Twilio request failed [${response.status}]: ${details}`);
      if (jobId) await db.from('lead_sms_jobs').update({ status: 'failed', error_details: `[${response.status}]: ${details}`, processed_at: new Date().toISOString() }).eq('id', jobId);
      return json({ ok: false, error: twilioSendError(response.status, details), status: response.status, details });
    }
    const data = await response.json();
    if (jobId) await db.from('lead_sms_jobs').update({ status: 'accepted', provider_message_id: data.sid, processed_at: new Date().toISOString() }).eq('id', jobId);
    return json({ ok: true, status: data.status });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'SMS request failed';
    if (jobId) await db.from('lead_sms_jobs').update({ status: 'failed', error_details: details, processed_at: new Date().toISOString() }).eq('id', jobId);
    return json({ error: details }, 500);
  }
});