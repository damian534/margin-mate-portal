// Extract the first URL from a string (returns absolute href or null).
// Used by ClientPortal to surface a prominent "Open link" button whenever a
// broker has included a URL in a document request description (e.g. a
// bankstatements.com.au share link). This guarantees clients never miss the
// link by it being buried as small body text.
export function extractFirstUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const regex = /((?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)+\.(?:com\.au|com|au|net|org|io|co)(?:\/[^\s]*)?)/i;
  const m = text.match(regex);
  if (!m) return null;
  const raw = m[0].replace(/[.,;:!?)]+$/, '');
  return raw.startsWith('http') ? raw : `https://${raw}`;
}