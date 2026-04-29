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
