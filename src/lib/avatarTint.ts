/**
 * Soft pastel tint for avatar initials, chosen deterministically from the
 * person's name so the same client always gets the same colour. Uses only
 * semantic design tokens at low opacity — decorative, never status meaning.
 */
const TINTS = [
  'bg-primary/10 text-primary',
  'bg-info/10 text-info',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
  'bg-accent/50 text-foreground',
] as const;

export function avatarTint(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TINTS[hash % TINTS.length];
}
