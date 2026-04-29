import { describe, it, expect } from 'vitest';
import { propagate, criticalPath, type EngineTask, type EngineDep } from '$lib/gantt/engine';
import { addWorkingDays, workingDaysBetween } from '$lib/gantt/calendar';

const t = (id: string, start: string, end: string): EngineTask => ({ id, startDate: start, endDate: end });
const dep = (p: string, s: string, lag = 0): EngineDep => ({ predecessorId: p, successorId: s, type: 'FS', lagDays: lag });

describe('calendar.addWorkingDays', () => {
  it('skips weekends', () => {
    // Friday 2026-04-24 + 1 working day = Monday 2026-04-27
    expect(addWorkingDays('2026-04-24', 1)).toBe('2026-04-27');
  });
  it('handles 0 days', () => {
    expect(addWorkingDays('2026-04-24', 0)).toBe('2026-04-24');
  });
  it('walks backward', () => {
    expect(addWorkingDays('2026-04-27', -1)).toBe('2026-04-24');
  });
});

describe('calendar.workingDaysBetween', () => {
  it('counts only weekdays', () => {
    // Mon 2026-04-20 → Mon 2026-04-27 = 5 working days
    expect(workingDaysBetween('2026-04-20', '2026-04-27')).toBe(5);
  });
  it('returns 0 for same day', () => {
    expect(workingDaysBetween('2026-04-20', '2026-04-20')).toBe(0);
  });
});

describe('propagate', () => {
  it('returns empty diff if change does not violate constraints', () => {
    const tasks = [t('A', '2026-04-06', '2026-04-10'), t('B', '2026-04-13', '2026-04-17')];
    const deps = [dep('A', 'B')];
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-06', end: '2026-04-09' });
    // A shrinks but B still starts after A.end+1 working day → no shift
    expect(diff.has('B')).toBe(false);
  });

  it('cascades a forward shift to immediate successor', () => {
    const tasks = [t('A', '2026-04-06', '2026-04-10'), t('B', '2026-04-13', '2026-04-17')];
    const deps = [dep('A', 'B')];
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-13', end: '2026-04-17' });
    // A moves +1 week, B must move accordingly
    expect(diff.has('A')).toBe(true);
    expect(diff.has('B')).toBe(true);
    const newB = diff.get('B')!;
    // B start should be the next working day after A.end (2026-04-17 → 2026-04-20)
    expect(newB.newStart).toBe('2026-04-20');
  });

  it('does NOT pull successors earlier', () => {
    const tasks = [t('A', '2026-04-06', '2026-04-10'), t('B', '2026-04-20', '2026-04-24')];
    const deps = [dep('A', 'B')];
    // Even if A moves earlier, B stays put
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-03-30', end: '2026-04-03' });
    expect(diff.has('B')).toBe(false);
  });

  it('cascades through a chain', () => {
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17'),
      t('C', '2026-04-20', '2026-04-24')
    ];
    const deps = [dep('A', 'B'), dep('B', 'C')];
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-13', end: '2026-04-17' });
    expect(diff.has('A')).toBe(true);
    expect(diff.has('B')).toBe(true);
    expect(diff.has('C')).toBe(true);
  });
});

describe('criticalPath', () => {
  it('returns the chain ending at the latest task', () => {
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17'),
      t('C', '2026-04-20', '2026-04-24'),
      t('X', '2026-04-06', '2026-04-08') // unrelated short task
    ];
    const deps = [dep('A', 'B'), dep('B', 'C')];
    const cp = criticalPath(tasks, deps);
    expect(cp.has('C')).toBe(true);
    expect(cp.has('B')).toBe(true);
    expect(cp.has('A')).toBe(true);
    expect(cp.has('X')).toBe(false);
  });
});

describe('propagate — Kaskaden, Zyklen, parallele Pfade', () => {
  it('cascades through deep chain (A→B→C→D→E)', () => {
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17'),
      t('C', '2026-04-20', '2026-04-24'),
      t('D', '2026-04-27', '2026-05-01'),
      t('E', '2026-05-04', '2026-05-08')
    ];
    const deps = [dep('A', 'B'), dep('B', 'C'), dep('C', 'D'), dep('D', 'E')];
    // Move A by +14 days
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-20', end: '2026-04-24' });
    expect(diff.has('A')).toBe(true);
    expect(diff.has('B')).toBe(true);
    expect(diff.has('C')).toBe(true);
    expect(diff.has('D')).toBe(true);
    expect(diff.has('E')).toBe(true);
    // E must end well into May
    expect(diff.get('E')!.newStart > '2026-05-08').toBe(true);
  });

  it('cascades to longer of two parallel predecessor paths', () => {
    // A and X both lead to D; A is moved, X stays. D must shift to whichever ends later.
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17'),
      t('X', '2026-04-06', '2026-05-01'), // long parallel path
      t('Y', '2026-05-04', '2026-05-08'),
      t('D', '2026-05-11', '2026-05-15')
    ];
    const deps = [dep('A', 'B'), dep('B', 'D'), dep('X', 'Y'), dep('Y', 'D')];
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-20', end: '2026-04-24' });
    // D should not move — X→Y still constrains it, and Y ends 2026-05-08, so
    // D's earliest start would still be 2026-05-11 (next working day after Y.end)
    // unless A→B→D pushes past that. Let's compute: A moves +14 days, B
    // becomes 2026-04-27→2026-05-01, then D required start = 2026-05-04 via
    // FS+1 working day. That's earlier than current 2026-05-11, so no push.
    expect(diff.has('D')).toBe(false);
  });

  it('does not infinite-loop when a dep cycle exists', () => {
    // Self-cycle (degenerate but possible from data corruption)
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17')
    ];
    const deps: EngineDep[] = [
      dep('A', 'B'),
      dep('B', 'A') // cycle
    ];
    const start = Date.now();
    propagate(tasks, deps, { id: 'A', start: '2026-04-13', end: '2026-04-17' });
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it('handles diamond dependency (A→B, A→C, B→D, C→D)', () => {
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-15'),
      t('C', '2026-04-13', '2026-04-17'), // longer
      t('D', '2026-04-20', '2026-04-24')
    ];
    const deps = [dep('A', 'B'), dep('A', 'C'), dep('B', 'D'), dep('C', 'D')];
    // Move A by +5 days
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-13', end: '2026-04-17' });
    expect(diff.has('B')).toBe(true);
    expect(diff.has('C')).toBe(true);
    expect(diff.has('D')).toBe(true);
    // D's new start should respect the LATER of B's end and C's end
    const cEnd = diff.get('C')!.newEnd;
    const dStart = diff.get('D')!.newStart;
    expect(dStart > cEnd).toBe(true);
  });

  it('respects positive lag-days (FS+3)', () => {
    const tasks = [
      t('A', '2026-04-06', '2026-04-10'),
      t('B', '2026-04-13', '2026-04-17')
    ];
    const deps: EngineDep[] = [
      { predecessorId: 'A', successorId: 'B', type: 'FS', lagDays: 3 }
    ];
    // A moves to 2026-04-13→2026-04-17 (Friday). B requires +3+1 working days = next Thu
    const diff = propagate(tasks, deps, { id: 'A', start: '2026-04-13', end: '2026-04-17' });
    expect(diff.has('B')).toBe(true);
    // A.end = 2026-04-17 (Fri) → +1 wd = Mon 04-20 → +3 lag = Thu 04-23
    expect(diff.get('B')!.newStart).toBe('2026-04-23');
  });
});
