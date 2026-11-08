export function normalizeSmsPhone(value: string): string | null {
  const clean = value.trim().replace(/[\s()-]/g, '');
  const international = /^04\d{8}$/.test(clean) ? `+61${clean.slice(1)}` : clean;
  return /^\+[1-9]\d{7,14}$/.test(international) ? international : null;
}