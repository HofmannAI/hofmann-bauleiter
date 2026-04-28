/**
 * Working-day calendar (Mon–Fri only). No holidays in v1 — see DECISIONS D-007.
 */
export const DAY_MS = 86400000;

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

export function fmtDate(d: Date | string): string {
  if (typeof d === 'string') return d;
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string | Date, n: number): string {
  const d = typeof s === 'string' ? parseDate(s) : new Date(s);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / DAY_MS);
}

export function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

export function addWorkingDays(start: string, n: number): string {
  if (n === 0) return start;
  const dir = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  const d = parseDate(start);
  while (remaining > 0) {
    d.setDate(d.getDate() + dir);
    if (!isWeekend(d)) remaining--;
  }
  return fmtDate(d);
}

export function workingDaysBetween(a: string, b: string): number {
  if (a === b) return 0;
  const dir = a < b ? 1 : -1;
  let count = 0;
  const d = parseDate(a);
  const end = parseDate(b);
  while ((dir > 0 && d < end) || (dir < 0 && d > end)) {
    d.setDate(d.getDate() + dir);
    if (!isWeekend(d)) count++;
  }
  return count * dir;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
