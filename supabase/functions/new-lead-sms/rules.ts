export function normalizeSmsPhone(value: string): string | null {
  const clean = value.trim().replace(/[\s()-]/g, '');
  const international = /^04\d{8}$/.test(clean) ? `+61${clean.slice(1)}` : clean;
  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}

export function newLeadSms(lead: { first_name: string; last_name: string; id: string }): string {
  const name = `${lead.first_name} ${lead.last_name}`.replace(/\s+/g, ' ').trim().slice(0, 60);
  return `Connect: New lead — ${name || 'New enquiry'}. https://connect.margin.com.au/admin?lead=${encodeURIComponent(lead.id)}`;
}