import { describe, it, expect } from 'vitest';
import { calculateFloat, type EngineTask, type EngineDep } from '$lib/gantt/engine';

const t = (id: string, start: string, end: string): EngineTask => ({ id, startDate: start, endDate: end });
const dep = (p: string, s: string, lag = 0): EngineDep => ({ predecessorId: p, successorId: s, type: 'FS', lagDays: lag });

describe('calculateFloat', () => {
  it('returns empty map for no tasks', () => {
    expect(calculateFloat([], []).size).toBe(0);
  });

  it('single task has 0 float', () => {
    const floats = calculateFloat([t('A', '2026-05-04', '2026-05-08')], []);
    expect(floats.get('A')).toBe(0);
  });

  it('task on critical path has 0 float', () => {
    const tasks = [
      t('A', '2026-05-04', '2026-05-08'),
      t('B', '2026-05-11', '2026-05-15')
    ];
    const deps = [dep('A', 'B')];
    const floats = calculateFloat(tasks, deps);
    // Both on the only path → 0 float
    expect(floats.get('A')).toBe(0);
    expect(floats.get('B')).toBe(0);
  });

  it('parallel task with shorter duration has positive float', () => {
    // A → C (long path)
    // B → C (short parallel task)
    // A: Mon-Fri (5 days), B: Mon-Wed (3 days), C: next Mon-Fri
    const tasks = [
      t('A', '2026-05-04', '2026-05-08'), // 5 working days
      t('B', '2026-05-04', '2026-05-06'), // 3 working days
      t('C', '2026-05-11', '2026-05-15')  // depends on both
    ];
    const deps = [dep('A', 'C'), dep('B', 'C')];
    const floats = calculateFloat(tasks, deps);
    // A is on critical path → 0 float
    expect(floats.get('A')).toBe(0);
    // B is shorter → has float (it could start later)
    expect(floats.get('B')!).toBeGreaterThan(0);
    // C is at the end → 0 float
    expect(floats.get('C')).toBe(0);
  });

  it('independent task has float equal to gap to project end', () => {
    // A and B are independent. A ends later → project end.
    // B finishes earlier → has float.
    const tasks = [
      t('A', '2026-05-04', '2026-05-15'), // 10 days
      t('B', '2026-05-04', '2026-05-08')  // 5 days
    ];
    const floats = calculateFloat(tasks, []);
    // A defines project end → 0 float
    expect(floats.get('A')).toBe(0);
    // B has float = gap to project end
    expect(floats.get('B')!).toBeGreaterThan(0);
  });
});
