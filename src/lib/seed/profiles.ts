/**
 * Bauleiter team. Emails are sourced from docs/SECRETS.md.
 * `initials` is computed in app code; here we keep the canonical pair (name, email).
 *
 * If a magic-link bounces (e.g. Simon's Umlaut), patch the email here and re-seed.
 */
export type BauleiterSeed = { name: string; email: string; role: 'admin' | 'bauleiter' };

export const BAULEITER_SEED: BauleiterSeed[] = [
  { name: 'Jonas Hofmann', email: 'jonas.hofmann@hofmann-haus.com', role: 'bauleiter' },
  { name: 'Laurenz Hofmann', email: 'laurenz.hofmann@hofmann-haus.com', role: 'admin' },
  { name: 'Marc Langer', email: 'marc.langer@hofmann-haus.com', role: 'bauleiter' },
  { name: 'Dorian Hartmann', email: 'dorian.hartmann@hofmann-haus.com', role: 'bauleiter' },
  { name: 'Johannes Wagner', email: 'johannes.wagner@hofmann-haus.com', role: 'bauleiter' },
  { name: 'Simon Müller', email: 'simon.müller@hofmann-haus.com', role: 'bauleiter' },
  { name: 'Dietmar Hofmann', email: 'dietmar.hofmann@hofmann-haus.com', role: 'bauleiter' }
];

export function computeInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
