export interface SignerDetails {
  name?: string | null;
  email?: string | null;
}

/** Keep the primary client first, without duplicating their saved applicant row. */
export function buildApplicantSigners(primary: SignerDetails | undefined, applicants: SignerDetails[]) {
  const clean = (person: SignerDetails) => ({
    name: person.name?.trim() || '',
    email: person.email?.trim() || '',
  });
  const first = clean(primary || {});
  const rows = first.name || first.email ? [first] : [];
  for (const applicant of applicants) {
    const row = clean(applicant);
    if (!row.name && !row.email) continue;
    const duplicate = rows.find(existing =>
      row.name && existing.name.toLowerCase() === row.name.toLowerCase() &&
      (!row.email || !existing.email || existing.email.toLowerCase() === row.email.toLowerCase())
    );
    if (duplicate) {
      if (!duplicate.email) duplicate.email = row.email;
    } else {
      rows.push(row);
    }
  }
  return rows.length ? rows : [{ name: '', email: '' }];
}