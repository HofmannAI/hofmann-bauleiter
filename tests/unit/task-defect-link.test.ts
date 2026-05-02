import { describe, it, expect } from 'vitest';

/**
 * Unit-tests for Task-Defect linking logic.
 * Tests the schema-level relationship and filtering logic
 * that will be used in the UI (filteredTasks, defect counts).
 */

type TaskStub = { id: string; name: string; gewerkId: string | null; endDate: string };
type DefectStub = { id: string; shortId: string; taskId: string | null; status: string; gewerkId: string | null };

// Mirrors the filteredTasks logic from defect detail page
function filterTasksByGewerk(allTasks: TaskStub[], gewerkId: string | null): TaskStub[] {
  if (!gewerkId) return allTasks;
  const matching = allTasks.filter((t) => t.gewerkId === gewerkId);
  const rest = allTasks.filter((t) => t.gewerkId !== gewerkId);
  return [...matching, ...rest];
}

// Mirrors the defect counting logic from bauzeitenplan server
function taskDefectCounts(defects: DefectStub[]): Map<string, { total: number; open: number }> {
  const map = new Map<string, { total: number; open: number }>();
  const closedStatuses = ['resolved', 'accepted', 'rejected'];
  for (const d of defects) {
    if (!d.taskId) continue;
    const entry = map.get(d.taskId) ?? { total: 0, open: 0 };
    entry.total++;
    if (!closedStatuses.includes(d.status)) entry.open++;
    map.set(d.taskId, entry);
  }
  return map;
}

describe('filterTasksByGewerk', () => {
  const tasks: TaskStub[] = [
    { id: 't1', name: 'Elektro Haus 1', gewerkId: 'g-elektro', endDate: '2026-05-10' },
    { id: 't2', name: 'Maler Haus 1', gewerkId: 'g-maler', endDate: '2026-05-15' },
    { id: 't3', name: 'Elektro Haus 2', gewerkId: 'g-elektro', endDate: '2026-05-20' },
    { id: 't4', name: 'Allgemein', gewerkId: null, endDate: '2026-05-25' }
  ];

  it('returns all tasks when no gewerk filter', () => {
    const result = filterTasksByGewerk(tasks, null);
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe('t1');
  });

  it('sorts matching gewerk first', () => {
    const result = filterTasksByGewerk(tasks, 'g-elektro');
    expect(result[0].id).toBe('t1');
    expect(result[1].id).toBe('t3');
    expect(result[2].id).toBe('t2');
    expect(result[3].id).toBe('t4');
  });

  it('returns all tasks even with gewerk filter (non-matching at end)', () => {
    const result = filterTasksByGewerk(tasks, 'g-maler');
    expect(result).toHaveLength(4);
    expect(result[0].id).toBe('t2'); // matching first
  });
});

describe('taskDefectCounts', () => {
  const defects: DefectStub[] = [
    { id: 'd1', shortId: 'M-001', taskId: 't1', status: 'open', gewerkId: 'g1' },
    { id: 'd2', shortId: 'M-002', taskId: 't1', status: 'resolved', gewerkId: 'g1' },
    { id: 'd3', shortId: 'M-003', taskId: 't1', status: 'sent', gewerkId: 'g1' },
    { id: 'd4', shortId: 'M-004', taskId: 't2', status: 'accepted', gewerkId: 'g2' },
    { id: 'd5', shortId: 'M-005', taskId: null, status: 'open', gewerkId: 'g1' }
  ];

  it('counts total and open defects per task', () => {
    const counts = taskDefectCounts(defects);
    expect(counts.get('t1')?.total).toBe(3);
    expect(counts.get('t1')?.open).toBe(2); // open + sent
    expect(counts.get('t2')?.total).toBe(1);
    expect(counts.get('t2')?.open).toBe(0); // accepted = closed
  });

  it('ignores defects without taskId', () => {
    const counts = taskDefectCounts(defects);
    expect(counts.has('null')).toBe(false);
    expect(counts.size).toBe(2);
  });

  it('returns empty map for no defects', () => {
    const counts = taskDefectCounts([]);
    expect(counts.size).toBe(0);
  });
});
