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

// Mirrors the verzugStatus logic from Gantt.svelte
type VerzugTask = { id: string; endDate: string };
type DefectCounts = { total: number; open: number };

function verzugStatus(t: VerzugTask, defectMap: Map<string, DefectCounts>, today: string): 'overdue' | 'clear' | 'none' {
  const counts = defectMap.get(t.id);
  if (!counts || counts.total === 0) return 'none';
  if (t.endDate < today && counts.open > 0) return 'overdue';
  if (counts.open === 0) return 'clear';
  return 'none';
}

describe('verzugStatus (Verzug-Ampel)', () => {
  const today = '2026-05-02';
  const defectMap = new Map<string, DefectCounts>([
    ['t1', { total: 3, open: 2 }],
    ['t2', { total: 1, open: 0 }],
    ['t3', { total: 5, open: 3 }]
  ]);

  it('returns overdue when task past endDate AND open defects', () => {
    expect(verzugStatus({ id: 't1', endDate: '2026-04-30' }, defectMap, today)).toBe('overdue');
  });

  it('returns clear when all defects resolved', () => {
    expect(verzugStatus({ id: 't2', endDate: '2026-04-30' }, defectMap, today)).toBe('clear');
  });

  it('returns none when task has no defects', () => {
    expect(verzugStatus({ id: 't99', endDate: '2026-04-30' }, defectMap, today)).toBe('none');
  });

  it('returns none when task not yet overdue even with open defects', () => {
    expect(verzugStatus({ id: 't3', endDate: '2026-06-01' }, defectMap, today)).toBe('none');
  });

  it('returns clear even when task is overdue but all defects closed', () => {
    expect(verzugStatus({ id: 't2', endDate: '2026-03-01' }, defectMap, today)).toBe('clear');
  });
});

// Mirrors the lostDaysPerGewerk logic from statistik page
type LostDaysRow = { taskId: string; taskEndDate: string; gewerkId: string | null; latestResolvedAt: string | null; openCount: number };

function calcLostDaysPerGewerk(rows: LostDaysRow[], today: Date): Map<string | null, number> {
  const gewerkDays = new Map<string | null, number>();
  for (const row of rows) {
    const taskEnd = new Date(row.taskEndDate).getTime();
    let actualEnd: number;
    if (row.openCount > 0) {
      actualEnd = today.getTime();
    } else if (row.latestResolvedAt) {
      actualEnd = new Date(row.latestResolvedAt).getTime();
    } else {
      continue;
    }
    const diffDays = Math.max(0, Math.round((actualEnd - taskEnd) / (1000 * 60 * 60 * 24)));
    if (diffDays <= 0) continue;
    gewerkDays.set(row.gewerkId, (gewerkDays.get(row.gewerkId) ?? 0) + diffDays);
  }
  return gewerkDays;
}

describe('calcLostDaysPerGewerk (KPI)', () => {
  const today = new Date('2026-05-02');

  it('calculates delay for tasks with resolved defects past endDate', () => {
    const rows: LostDaysRow[] = [
      { taskId: 't1', taskEndDate: '2026-04-20', gewerkId: 'g1', latestResolvedAt: '2026-04-25T10:00:00Z', openCount: 0 }
    ];
    const result = calcLostDaysPerGewerk(rows, today);
    expect(result.get('g1')).toBe(5); // Apr 20 -> Apr 25 = 5 days
  });

  it('uses today for tasks with still-open defects', () => {
    const rows: LostDaysRow[] = [
      { taskId: 't1', taskEndDate: '2026-04-30', gewerkId: 'g1', latestResolvedAt: null, openCount: 2 }
    ];
    const result = calcLostDaysPerGewerk(rows, today);
    expect(result.get('g1')).toBe(2); // Apr 30 -> May 2 = 2 days
  });

  it('ignores tasks where defects resolved before endDate', () => {
    const rows: LostDaysRow[] = [
      { taskId: 't1', taskEndDate: '2026-05-10', gewerkId: 'g1', latestResolvedAt: '2026-05-05T10:00:00Z', openCount: 0 }
    ];
    const result = calcLostDaysPerGewerk(rows, today);
    expect(result.has('g1')).toBe(false); // No delay
  });

  it('aggregates across multiple tasks per gewerk', () => {
    const rows: LostDaysRow[] = [
      { taskId: 't1', taskEndDate: '2026-04-20', gewerkId: 'g1', latestResolvedAt: '2026-04-25T00:00:00Z', openCount: 0 },
      { taskId: 't2', taskEndDate: '2026-04-22', gewerkId: 'g1', latestResolvedAt: '2026-04-29T00:00:00Z', openCount: 0 }
    ];
    const result = calcLostDaysPerGewerk(rows, today);
    expect(result.get('g1')).toBe(12); // 5 + 7
  });

  it('returns empty map when no delays', () => {
    const result = calcLostDaysPerGewerk([], today);
    expect(result.size).toBe(0);
  });
});
