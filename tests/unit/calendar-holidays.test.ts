import { describe, it, expect } from 'vitest';
import {
  addWorkingDays,
  workingDaysBetween,
  holidaysBW,
  isHoliday,
  isNonWorkday,
  holidayName,
  parseDate
} from '$lib/gantt/calendar';

describe('holidaysBW', () => {
  it('returns 14 holidays for BW', () => {
    const h2026 = holidaysBW(2026);
    expect(h2026.size).toBe(14);
  });

  it('includes fixed holidays', () => {
    const h = holidaysBW(2026);
    expect(h.has('2026-01-01')).toBe(true); // Neujahr
    expect(h.has('2026-01-06')).toBe(true); // Hl. Drei Könige
    expect(h.has('2026-05-01')).toBe(true); // Tag der Arbeit
    expect(h.has('2026-10-03')).toBe(true); // Tag der Dt. Einheit
    expect(h.has('2026-11-01')).toBe(true); // Allerheiligen
    expect(h.has('2026-12-25')).toBe(true); // 1. Weihnachtstag
    expect(h.has('2026-12-26')).toBe(true); // 2. Weihnachtstag
  });

  it('calculates Easter 2026 correctly (April 5)', () => {
    const h = holidaysBW(2026);
    // Easter Sunday 2026 = April 5
    expect(h.has('2026-04-03')).toBe(true); // Karfreitag (Easter - 2)
    expect(h.has('2026-04-05')).toBe(true); // Ostersonntag
    expect(h.has('2026-04-06')).toBe(true); // Ostermontag (Easter + 1)
    expect(h.has('2026-05-14')).toBe(true); // Himmelfahrt (Easter + 39)
    expect(h.has('2026-05-24')).toBe(true); // Pfingstsonntag (Easter + 49)
    expect(h.has('2026-05-25')).toBe(true); // Pfingstmontag (Easter + 50)
    expect(h.has('2026-06-04')).toBe(true); // Fronleichnam (Easter + 60)
  });

  it('calculates Easter 2025 correctly (April 20)', () => {
    const h = holidaysBW(2025);
    expect(h.has('2025-04-18')).toBe(true); // Karfreitag
    expect(h.has('2025-04-20')).toBe(true); // Ostersonntag
    expect(h.has('2025-04-21')).toBe(true); // Ostermontag
  });

  it('calculates Easter 2027 correctly (March 28)', () => {
    const h = holidaysBW(2027);
    expect(h.has('2027-03-26')).toBe(true); // Karfreitag
    expect(h.has('2027-03-28')).toBe(true); // Ostersonntag
    expect(h.has('2027-03-29')).toBe(true); // Ostermontag
  });
});

describe('isHoliday', () => {
  it('detects Karfreitag 2026', () => {
    expect(isHoliday(parseDate('2026-04-03'))).toBe(true);
  });

  it('does not flag normal weekday', () => {
    expect(isHoliday(parseDate('2026-04-07'))).toBe(false); // Tuesday after Easter
  });
});

describe('isNonWorkday', () => {
  it('detects weekends', () => {
    expect(isNonWorkday(parseDate('2026-05-09'))).toBe(true); // Saturday
  });

  it('detects holidays on weekdays', () => {
    // Tag der Arbeit 2026 = Friday
    expect(isNonWorkday(parseDate('2026-05-01'))).toBe(true);
  });

  it('normal weekday is workday', () => {
    expect(isNonWorkday(parseDate('2026-05-04'))).toBe(false); // Monday
  });
});

describe('holidayName', () => {
  it('returns correct name', () => {
    expect(holidayName(parseDate('2026-04-03'))).toBe('Karfreitag');
    expect(holidayName(parseDate('2026-12-25'))).toBe('1. Weihnachtstag');
    expect(holidayName(parseDate('2026-06-04'))).toBe('Fronleichnam');
  });

  it('returns null for non-holidays', () => {
    expect(holidayName(parseDate('2026-04-07'))).toBeNull();
  });
});

describe('addWorkingDays with holidays', () => {
  it('skips Karfreitag + Ostermontag 2026', () => {
    // Thursday April 2 + 1 working day: skip Fri Apr 3 (Karfreitag),
    // Sat Apr 4, Sun Apr 5 (Ostersonntag), Mon Apr 6 (Ostermontag)
    // = Tuesday April 7
    expect(addWorkingDays('2026-04-02', 1)).toBe('2026-04-07');
  });

  it('skips Tag der Arbeit 2026 (May 1, Friday)', () => {
    // Thursday April 30 + 1 wd should skip May 1 (holiday) + weekend = Mon May 4
    expect(addWorkingDays('2026-04-30', 1)).toBe('2026-05-04');
  });

  it('handles Himmelfahrt week (May 14 Thu)', () => {
    // Wednesday May 13 + 1 wd = Thursday May 14 is Himmelfahrt → skip to Fri May 15
    expect(addWorkingDays('2026-05-13', 1)).toBe('2026-05-15');
  });

  it('backward skips holidays too', () => {
    // Tuesday April 7 - 1 wd: Mon Apr 6 = Ostermontag (skip) → back to Thu Apr 2
    expect(addWorkingDays('2026-04-07', -1)).toBe('2026-04-02');
  });
});

describe('workingDaysBetween with holidays', () => {
  it('excludes Easter holidays from count', () => {
    // April 2 (Thu) to April 6 (Mon Ostermontag):
    // Fri Apr 3 = Karfreitag (skip), Sat (skip), Sun (skip), Mon = Ostermontag (skip)
    // = 0 working days
    expect(workingDaysBetween('2026-04-02', '2026-04-06')).toBe(0);
    // April 2 to April 7 (Tue after Easter) = 1 working day
    expect(workingDaysBetween('2026-04-02', '2026-04-07')).toBe(1);
  });

  it('counts correctly over Easter week', () => {
    // March 30 (Mon) to April 6 (Mon Easter Monday)
    // Working days: Mon 30, Tue 31, Wed 1, Thu 2 (Fri 3 = Karfreitag skip, Sat/Sun skip, Mon 6 = Ostermontag skip)
    // Wait — April 6 is Ostermontag, which is a holiday. So Mon-Mon = 4 working days if endpoint excluded
    // workingDaysBetween counts days BETWEEN, not including start, including end? Let me check the implementation.
    // It walks from a toward b, counting each step that's not a non-workday.
    // From Mon Mar 30: Tue 31 (work), Wed Apr 1 (work), Thu Apr 2 (work), Fri Apr 3 (Karfreitag SKIP),
    // Sat Apr 4 (SKIP), Sun Apr 5 (SKIP), Mon Apr 6 (Ostermontag SKIP) → reached end
    // Count = 3
    expect(workingDaysBetween('2026-03-30', '2026-04-06')).toBe(3);
  });
});
