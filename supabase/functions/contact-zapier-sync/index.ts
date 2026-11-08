import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fired by the trg_contact_zapier_sync database trigger whenever a contact is
 * created. Looks up the owning brokerage's Zapier webhook URL and POSTs the
 * new contact to it, so tools like MyCRM can be kept in sync via Zapier.
 *
 * Authenticated by a shared secret header set in the trigger — there is no
 * user session on database-webhook calls.
 */
const SYNC_KEY = 'czs-kX92mfQ7Lp4wZt8R';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (req.headers.get('x-sync-key') !== SYNC_KEY) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { record } = await req.json();
    if (!record?.id) {
      return new Response(JSON.stringify({ error: 'Missing contact record' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // The contact's creator owns the brokerage whose Zapier URL we use.
    const { data: settings } = await supabase
      .from('broker_email_settings')
      .select('zapier_webhook_url')
      .eq('broker_id', record.created_by)
      .maybeSingle();

    const zapierUrl = settings?.zapier_webhook_url?.trim();
    if (!zapierUrl) {
      // No Zapier hook configured for this brokerage — nothing to do.
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = {
      event: 'contact.created',
      contact: {
        id: record.id,
        first_name: record.first_name,
        last_name: record.last_name,
        full_name: [record.first_name, record.last_name].filter(Boolean).join(' '),
        email: record.email,
        phone: record.phone,
        type: record.type,
        company: record.company,
        notes: record.notes,
        created_at: record.created_at,
      },
    };

    const res = await fetch(zapierUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.text();
    if (!res.ok) {
      console.error(`Zapier webhook failed [${res.status}]: ${body}`);
    } else {
      console.log(`Contact ${record.id} synced to Zapier (${res.status})`);
    }

    // Always return 200 to the database trigger — a Zapier outage must never
    // block or retry contact creation inside Connect.
    return new Response(
      JSON.stringify({ ok: res.ok, status: res.status }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('contact-zapier-sync error:', e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
