/**
 * Gantt constraint-propagation engine. Pure functions, no DB, no IO.
 * Working days only (Mon–Fri). No holidays in v1.
 *
 * - propagate(): given a manual change, push successors forward as needed.
 *   Never auto-pulls earlier — user explicitly compresses if desired.
 * - criticalPath(): longest dependency chain ending at the latest end_date.
 */
import { addWorkingDays, parseDate, fmtDate, workingDaysBetween } from './calendar';

export type EngineTask = {
  id: string;
  startDate: string;
  endDate: string;
  durationAt?: number | null;
  parentId?: string | null;
};

export type EngineDep = {
  predecessorId: string;
  successorId: string;
  type: 'FS' | 'SS' | 'FF' | 'SF';
  lagDays: number;
};

export type DateRange = { start: string; end: string };

export type Diff = Map<string, { oldStart: string; oldEnd: string; newStart: string; newEnd: string }>;

/** Compute the earliest dependency-required start for a task (in YYYY-MM-DD). */
function requiredStart(taskId: string, deps: EngineDep[], scheduled: Map<string, DateRange>): string | null {
  let best: string | null = null;
  for (const d of deps) {
    if (d.successorId !== taskId) continue;
    const pred = scheduled.get(d.predecessorId);
    if (!pred) continue;
    let candidate: string;
    switch (d.type) {
      case 'FS':
        candidate = addWorkingDays(pred.end, 1 + d.lagDays);
        break;
      case 'SS':
        candidate = addWorkingDays(pred.start, d.lagDays);
        break;
      case 'FF': {
        // For FF: succ.end >= pred.end + lag → succ.start = succ.end - duration
        const succ = scheduled.get(taskId);
        if (!succ) continue;
        const succDur = workingDaysBetween(succ.start, succ.end);
        const requiredEnd = addWorkingDays(pred.end, d.lagDays);
        candidate = addWorkingDays(requiredEnd, -succDur);
        break;
      }
      case 'SF': {
        const succ = scheduled.get(taskId);
        if (!succ) continue;
        const succDur = workingDaysBetween(succ.start, succ.end);
        const requiredEnd = addWorkingDays(pred.start, d.lagDays);
        candidate = addWorkingDays(requiredEnd, -succDur);
        break;
      }
    }
    if (best === null || candidate > best) best = candidate;
  }
  return best;
}

function topoOrder(taskIds: string[], deps: EngineDep[]): string[] {
  const indeg = new Map<string, number>(taskIds.map((id) => [id, 0]));
  const adj = new Map<string, string[]>();
  for (const id of taskIds) adj.set(id, []);
  for (const d of deps) {
    if (!indeg.has(d.successorId) || !indeg.has(d.predecessorId)) continue;
    indeg.set(d.successorId, (indeg.get(d.successorId) ?? 0) + 1);
    adj.get(d.predecessorId)!.push(d.successorId);
  }
  const queue = taskIds.filter((id) => (indeg.get(id) ?? 0) === 0);
  const out: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    out.push(id);
    for (const next of adj.get(id) ?? []) {
      const v = (indeg.get(next) ?? 0) - 1;
      indeg.set(next, v);
      if (v === 0) queue.push(next);
    }
  }
  // Append any remaining (cycle case) so caller still sees them
  for (const id of taskIds) if (!out.includes(id)) out.push(id);
  return out;
}

/**
 * Apply a change to one task; cascade only forward (push successors that
 * would now violate their dependency). Returns a diff Map. The original tasks
 * array is NOT mutated.
 */
export function propagate(
  tasks: EngineTask[],
  deps: EngineDep[],
  change: { id: string; start?: string; end?: string }
): Diff {
  const sched = new Map<string, DateRange>();
  for (const t of tasks) sched.set(t.id, { start: t.startDate, end: t.endDate });

  const original = new Map(sched);

  // Apply the change directly
  const target = sched.get(change.id);
  if (!target) return new Map();
  let newStart = change.start ?? target.start;
  let newEnd = change.end ?? target.end;
  if (newStart > newEnd) newEnd = newStart;
  sched.set(change.id, { start: newStart, end: newEnd });

  const order = topoOrder(tasks.map((t) => t.id), deps);
  // Iterate twice: simple to implement, sufficient for chains within reasonable depth.
  for (let pass = 0; pass < 2; pass++) {
    for (const id of order) {
      if (id === change.id && pass === 0) continue;
      const cur = sched.get(id);
      if (!cur) continue;
      const reqStart = requiredStart(id, deps, sched);
      if (reqStart && reqStart > cur.start) {
        const dur = workingDaysBetween(cur.start, cur.end);
        const newS = reqStart;
        const newE = addWorkingDays(newS, dur);
        sched.set(id, { start: newS, end: newE });
      }
    }
  }

  const diff: Diff = new Map();
  for (const [id, r] of sched) {
    const o = original.get(id);
    if (!o) continue;
    if (o.start !== r.start || o.end !== r.end) {
      diff.set(id, { oldStart: o.start, oldEnd: o.end, newStart: r.start, newEnd: r.end });
    }
  }
  return diff;
}

/**
 * Calculate Total Float (Pufferzeit) for each task.
 * Float = how many days the task can slip without delaying the project end.
 * Uses forward pass (early dates) + backward pass (late dates).
 * Float = lateStart - earlyStart.
 */
export function calculateFloat(tasks: EngineTask[], deps: EngineDep[]): Map<string, number> {
  if (tasks.length === 0) return new Map();

  // Forward pass: early start/end (= current schedule)
  const earlyStart = new Map<string, string>();
  const earlyEnd = new Map<string, string>();
  for (const t of tasks) {
    earlyStart.set(t.id, t.startDate);
    earlyEnd.set(t.id, t.endDate);
  }

  // Project end = latest earlyEnd
  let projectEnd = tasks[0].endDate;
  for (const t of tasks) if (t.endDate > projectEnd) projectEnd = t.endDate;

  // Backward pass: late start/end
  const lateEnd = new Map<string, string>();
  const lateStart = new Map<string, string>();

  // Initialize: tasks with no successors get lateEnd = projectEnd
  const hasSuccessor = new Set<string>();
  for (const d of deps) hasSuccessor.add(d.predecessorId);

  for (const t of tasks) {
    if (!hasSuccessor.has(t.id)) {
      lateEnd.set(t.id, projectEnd);
    }
  }

  // Reverse topological order
  const order = topoOrder(tasks.map((t) => t.id), deps);
  const reverseOrder = [...order].reverse();

  // Multiple passes for convergence (handles complex dependency patterns)
  for (let pass = 0; pass < 2; pass++) {
    for (const id of reverseOrder) {
      const t = tasks.find((x) => x.id === id);
      if (!t) continue;

      // lateEnd = min of all successors' required latest time for this task
      for (const d of deps) {
        if (d.predecessorId !== id) continue;
        const succLateStart = lateStart.get(d.successorId);
        if (!succLateStart) continue;

        let constraint: string;
        switch (d.type) {
          case 'FS':
            constraint = addWorkingDays(succLateStart, -(1 + d.lagDays));
            break;
          case 'SS': {
            const dur = workingDaysBetween(t.startDate, t.endDate);
            constraint = addWorkingDays(succLateStart, -d.lagDays);
            // Convert to lateEnd
            constraint = addWorkingDays(constraint, dur);
            // But we want the end constraint
            break;
          }
          default:
            // For FF/SF, simplified: use FS-like behavior
            constraint = addWorkingDays(succLateStart, -(1 + d.lagDays));
            break;
        }

        const cur = lateEnd.get(id);
        if (!cur || constraint < cur) lateEnd.set(id, constraint);
      }

      // Calculate lateStart from lateEnd
      const le = lateEnd.get(id);
      if (le) {
        const dur = workingDaysBetween(t.startDate, t.endDate);
        lateStart.set(id, addWorkingDays(le, -dur));
      }
    }
  }

  // Float = lateStart - earlyStart (in working days)
  const floatMap = new Map<string, number>();
  for (const t of tasks) {
    const es = earlyStart.get(t.id);
    const ls = lateStart.get(t.id);
    if (es && ls) {
      const float = workingDaysBetween(es, ls);
      floatMap.set(t.id, Math.max(0, float));
    }
  }
  return floatMap;
}

/**
 * Critical path: tasks on the longest chain ending at the project's last end_date.
 * Returns set of task ids on the path. Edge weights are the task's working-day
 * duration; we walk back from the latest-ending task following predecessors.
 */
/**
 * Defect impact on critical path: open defects delay the task they're linked to.
 * Each open defect adds an estimated delay based on average resolution time.
 */
export type DefectImpact = {
  taskId: string;
  openCount: number;
  estimatedDelayDays: number;
};

export function criticalPathWithDefects(
  tasks: EngineTask[],
  deps: EngineDep[],
  defectCounts: Array<{ taskId: string; open: number }>
): { path: Set<string>; defectImpacts: DefectImpact[] } {
  const DAYS_PER_DEFECT = 2; // estimated delay per open defect
  const defectMap = new Map(defectCounts.map((d) => [d.taskId, d.open]));

  // Adjust task end dates by defect impact for critical path calculation
  const adjustedTasks = tasks.map((t) => {
    const openDefects = defectMap.get(t.id) ?? 0;
    if (openDefects === 0) return t;
    const delay = openDefects * DAYS_PER_DEFECT;
    const adjustedEnd = addWorkingDays(t.endDate, delay);
    return { ...t, endDate: adjustedEnd };
  });

  const path = criticalPath(adjustedTasks, deps);

  const defectImpacts: DefectImpact[] = [];
  for (const [taskId, count] of defectMap) {
    if (count > 0 && path.has(taskId)) {
      defectImpacts.push({
        taskId,
        openCount: count,
        estimatedDelayDays: count * DAYS_PER_DEFECT
      });
    }
  }

  return { path, defectImpacts };
}

export function criticalPath(tasks: EngineTask[], deps: EngineDep[]): Set<string> {
  if (tasks.length === 0) return new Set();
  // Find ending tasks (those with no FS/FF successors) — but simpler: use latest-ending task overall
  let latest = tasks[0];
  for (const t of tasks) if (t.endDate > latest.endDate) latest = t;

  const predOf = new Map<string, EngineDep[]>();
  for (const d of deps) {
    if (!predOf.has(d.successorId)) predOf.set(d.successorId, []);
    predOf.get(d.successorId)!.push(d);
  }

  const path = new Set<string>();
  let cur: EngineTask | null = latest;
  let safety = tasks.length + 1;
  while (cur && safety-- > 0) {
    const node: EngineTask = cur;
    path.add(node.id);
    const incoming: EngineDep[] = predOf.get(node.id) ?? [];
    if (incoming.length === 0) break;
    // pick the predecessor whose end is closest to cur.start (the binding constraint)
    let bestPred: EngineTask | null = null;
    let bestEnd = '';
    for (const d of incoming) {
      const p: EngineTask | undefined = tasks.find((t) => t.id === d.predecessorId);
      if (!p) continue;
      if (p.endDate > bestEnd) {
        bestEnd = p.endDate;
        bestPred = p;
      }
    }
    cur = bestPred;
  }
  return path;
}
