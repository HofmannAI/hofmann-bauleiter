/**
 * Working-day calendar with Baden-Württemberg holidays.
 * Non-workdays: weekends (Sa/So) + BW gesetzliche Feiertage.
 */
export const DAY_MS = 86400000;

export function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00');
}

export function fmtDate(d: Date | string): string {
  if (typeof d === 'string') return d;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

/* ===== Baden-Württemberg Feiertage ===== */

/** Gauss Easter algorithm — returns Easter Sunday for a given year. */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** All BW holidays for a given year as YYYY-MM-DD strings. */
export function holidaysBW(year: number): Set<string> {
  const easter = easterSunday(year);
  const d = (offset: number) => {
    const dt = new Date(easter);
    dt.setDate(dt.getDate() + offset);
    return fmtDate(dt);
  };

  return new Set([
    `${year}-01-01`,                // Neujahr
    `${year}-01-06`,                // Heilige Drei Könige (BW)
    d(-2),                          // Karfreitag
    d(0),                           // Ostersonntag
    d(1),                           // Ostermontag
    `${year}-05-01`,                // Tag der Arbeit
    d(39),                          // Christi Himmelfahrt
    d(49),                          // Pfingstsonntag
    d(50),                          // Pfingstmontag
    d(60),                          // Fronleichnam (BW)
    `${year}-10-03`,                // Tag der Deutschen Einheit
    `${year}-11-01`,                // Allerheiligen (BW)
    `${year}-12-25`,                // 1. Weihnachtstag
    `${year}-12-26`,                // 2. Weihnachtstag
  ]);
}

// Cache holidays per year to avoid recalculation
const holidayCache = new Map<number, Set<string>>();
function getHolidays(year: number): Set<string> {
  if (!holidayCache.has(year)) holidayCache.set(year, holidaysBW(year));
  return holidayCache.get(year)!;
}

/** Check if a date is a BW holiday. */
export function isHoliday(d: Date): boolean {
  const iso = fmtDate(d);
  return getHolidays(d.getFullYear()).has(iso);
}

/** Check if a date is a non-workday (weekend OR holiday). */
export function isNonWorkday(d: Date): boolean {
  return isWeekend(d) || isHoliday(d);
}

/** Get holiday name for display (returns null if not a holiday). */
export function holidayName(d: Date): string | null {
  const iso = fmtDate(d);
  const year = d.getFullYear();
  if (!getHolidays(year).has(iso)) return null;
  const easter = easterSunday(year);
  // Calculate offset in days from Easter (using date diff to avoid DST issues)
  const offset = Math.round((parseDate(iso).getTime() - parseDate(fmtDate(easter)).getTime()) / DAY_MS);

  if (iso === `${year}-01-01`) return 'Neujahr';
  if (iso === `${year}-01-06`) return 'Heilige Drei Könige';
  if (offset === -2) return 'Karfreitag';
  if (offset === 0) return 'Ostersonntag';
  if (offset === 1) return 'Ostermontag';
  if (iso === `${year}-05-01`) return 'Tag der Arbeit';
  if (offset === 39) return 'Christi Himmelfahrt';
  if (offset === 49) return 'Pfingstsonntag';
  if (offset === 50) return 'Pfingstmontag';
  if (offset === 60) return 'Fronleichnam';
  if (iso === `${year}-10-03`) return 'Tag der Dt. Einheit';
  if (iso === `${year}-11-01`) return 'Allerheiligen';
  if (iso === `${year}-12-25`) return '1. Weihnachtstag';
  if (iso === `${year}-12-26`) return '2. Weihnachtstag';
  return null;
}

export function addWorkingDays(start: string, n: number): string {
  if (n === 0) return start;
  const dir = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  const d = parseDate(start);
  while (remaining > 0) {
    d.setDate(d.getDate() + dir);
    if (!isNonWorkday(d)) remaining--;
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
    if (!isNonWorkday(d)) count++;
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
