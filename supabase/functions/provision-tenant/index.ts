import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Per-broker configuration tables that get cloned into a brand new brokerage.
const CLONE_TABLES = [
  'lenders',
  'document_templates',
  'task_templates',
  'milestone_email_templates',
] as const;

// Columns that must never be copied across from the template brokerage.
const STRIP = new Set(['id', 'broker_id', 'created_at', 'updated_at']);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // --- Authorise: super admins only -----------------------------------------
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing authorization' }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);
  const callerId = userData.user.id;

  const { data: callerRoles } = await admin
    .from('user_roles').select('role').eq('user_id', callerId);
  if (!callerRoles?.some(r => r.role === 'super_admin')) {
    return json({ error: 'Only platform admins can provision a brokerage' }, 403);
  }

  // --- Validate input --------------------------------------------------------
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON body' }, 400); }

  const name = String(body.name ?? '').trim();
  const ownerEmail = String(body.owner_email ?? '').trim().toLowerCase();
  const ownerName = String(body.owner_name ?? '').trim();
  const customDomain = body.custom_domain ? String(body.custom_domain).trim().toLowerCase() : null;
  const cloneFromBrokerId = body.clone_from_broker_id ? String(body.clone_from_broker_id) : callerId;

  if (name.length < 2) return json({ error: 'Business name is required' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) return json({ error: 'A valid owner email is required' }, 400);

  const slug = slugify(name) || `tenant-${Date.now()}`;

  // --- Create the tenant -----------------------------------------------------
  const { data: tenant, error: tenantErr } = await admin
    .from('tenants')
    .insert({
      slug,
      name,
      custom_domain: customDomain,
      support_email: ownerEmail,
      sender_name: name,
      status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 864e5).toISOString(),
    })
    .select()
    .single();
  if (tenantErr) return json({ error: `Could not create brokerage: ${tenantErr.message}` }, 400);

  // --- Create the owner login ------------------------------------------------
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: ownerEmail,
    email_confirm: true,
    user_metadata: { full_name: ownerName || name },
  });

  let ownerUserId = created?.user?.id ?? null;
  if (createErr && !ownerUserId) {
    // Existing account — reuse it rather than failing the whole provision.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    ownerUserId = list?.users.find(u => u.email?.toLowerCase() === ownerEmail)?.id ?? null;
    if (!ownerUserId) {
      await admin.from('tenants').delete().eq('id', tenant.id);
      return json({ error: `Could not create owner account: ${createErr.message}` }, 400);
    }
  }

  await admin.from('profiles').upsert(
    {
      user_id: ownerUserId,
      email: ownerEmail,
      full_name: ownerName || name,
      company_name: name,
      tenant_id: tenant.id,
      broker_id: ownerUserId,
    },
    { onConflict: 'user_id' },
  );

  await admin.from('user_roles').insert({ user_id: ownerUserId, role: 'broker' });
  await admin.from('tenants').update({ owner_user_id: ownerUserId }).eq('id', tenant.id);

  // --- Clone the master configuration ---------------------------------------
  const cloned: Record<string, number> = {};
  for (const table of CLONE_TABLES) {
    const { data: rows } = await admin.from(table).select('*').eq('broker_id', cloneFromBrokerId);
    if (!rows?.length) { cloned[table] = 0; continue; }
    const payload = rows.map((row: Record<string, unknown>) => {
      const copy: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) if (!STRIP.has(k)) copy[k] = v;
      copy.broker_id = ownerUserId;
      return copy;
    });
    const { error: cloneErr } = await admin.from(table).insert(payload);
    cloned[table] = cloneErr ? 0 : payload.length;
  }

  // --- Starter invite code for their team ------------------------------------
  const inviteCode = `${slug.toUpperCase().replace(/-/g, '').slice(0, 6)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  await admin.from('invite_codes').insert({
    broker_id: ownerUserId,
    code: inviteCode,
    label: `${name} team`,
    target_role: 'broker_staff',
    is_active: true,
  });

  // --- Password setup link for the owner -------------------------------------
  const { data: link } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: ownerEmail,
  });

  return json({
    tenant_id: tenant.id,
    slug,
    owner_user_id: ownerUserId,
    invite_code: inviteCode,
    cloned,
    setup_link: link?.properties?.action_link ?? null,
  });
});
