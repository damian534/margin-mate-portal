export function parseMetaLead(data: { field_data?: { name: string; values?: string[] }[]; campaign_name?: string; adset_name?: string; ad_name?: string; form_id?: string }) {
  const fields = Object.fromEntries((data.field_data ?? []).map(f => [f.name.toLowerCase(), (f.values ?? []).join(', ')]));
  const names = (fields.full_name ?? '').trim().split(/\s+/);
  const firstName = fields.first_name || names[0] || 'Unknown';
  const lastName = fields.last_name || names.slice(1).join(' ');
  const standard = ['full_name', 'first_name', 'last_name', 'email', 'phone_number', 'phone'];
  const answers = Object.entries(fields).filter(([k, v]) => !standard.includes(k) && !!v).map(([k, v]) => ({ question: k.replace(/[_.-]+/g, ' '), answer: v }));
  const attribution = Object.fromEntries(Object.entries({ campaign: data.campaign_name, adset: data.adset_name, ad: data.ad_name, form_id: data.form_id }).filter(([, v]) => !!v));
  return { firstName, lastName, email: fields.email ?? '', phone: fields.phone_number || fields.phone || '', customFields: { form_answers: answers, ad_attribution: attribution }, notes: ['Auto-created from a Facebook / Instagram lead form', ...Object.entries(attribution).map(([k, v]) => `${k}: ${v}`), ...answers.map(a => `${a.question}: ${a.answer}`)].join('\n') };
}

export async function verifyMetaSignature(raw: string, signature: string | null, secret: string): Promise<boolean> {
  if (!secret || !signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g) ?? [], v => parseInt(v, 16));
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(raw));
}

export function canManageMeta(userId: string, brokerId: string, roles: string[]) {
  return roles.some(r => ['super_admin', 'platform_owner'].includes(r)) || (userId === brokerId && roles.some(r => ['broker', 'tenant_owner'].includes(r)));
}
/** Stable verify token derived from a server-only key, shown to Page managers so it can be copied into Facebook. */
export async function connectVerifyToken(serverKey: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(serverKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('connect-meta-verify-v1')));
  return 'connect_' + Array.from(sig.slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
}
