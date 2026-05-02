import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, taskBaselines, taskDependencies, gewerke, houses, apartments, activity, defects } from '$lib/db/schema';
import { eq, and, asc, desc, or, sql } from 'drizzle-orm';
import { loadGaisbachSample } from '$lib/db/projectQueries';
import { getProjectTasksAndDeps, applyTaskUpdates } from '$lib/db/taskQueries';
import { propagate, type EngineTask, type EngineDep } from '$lib/gantt/engine';

export const load: PageServerLoad = async ({ params }) => {
  const { tasks: tRows, deps } = await getProjectTasksAndDeps(params.projectId);
  if (!db) return { tasks: tRows, deps, gewerke: [], houses: [], baselineLabels: [], taskDefectCounts: [] };

  const [gewerkeRows, houseRows, taskDefectCounts] = await Promise.all([
    db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)),
    db.select().from(houses).where(eq(houses.projectId, params.projectId)).orderBy(asc(houses.sortOrder)),
    db.select({
      taskId: defects.taskId,
      total: sql<number>`count(*)::int`,
      open: sql<number>`count(*) FILTER (WHERE ${defects.status} NOT IN ('resolved', 'accepted', 'rejected'))::int`
    })
      .from(defects)
      .where(and(eq(defects.projectId, params.projectId), sql`${defects.taskId} IS NOT NULL`))
      .groupBy(defects.taskId)
  ]);

  // Aggregate apartments per house
  const houseTree = await Promise.all(
    houseRows.map(async (h) => ({
      ...h,
      apartments: await db.select().from(apartments).where(eq(apartments.houseId, h.id)).orderBy(asc(apartments.sortOrder))
    }))
  );

  // Distinct baseline labels for picker
  const baselineRows = await db
    .select({ label: taskBaselines.snapshotLabel, snapshotAt: taskBaselines.snapshotAt })
    .from(taskBaselines)
    .where(eq(taskBaselines.projectId, params.projectId))
    .orderBy(desc(taskBaselines.snapshotAt));
  const seen = new Set<string>();
  const baselineLabels: { label: string; snapshotAt: Date }[] = [];
  for (const r of baselineRows) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    baselineLabels.push({ label: r.label, snapshotAt: r.snapshotAt });
  }

  return { tasks: tRows, deps, gewerke: gewerkeRows, houses: houseTree, baselineLabels, taskDefectCounts };
};

const moveSchema = z.object({
  taskId: z.string().uuid(),
  newStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  newEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confirmed: z.enum(['true', 'false']).optional()
});

export const actions: Actions = {
  loadSample: async ({ params, locals }) => {
    if (!locals.user || !db) return fail(401);
    await loadGaisbachSample(params.projectId);
    redirect(303, `/${params.projectId}/bauzeitenplan`);
  },

  /**
   * Preview a move: returns the diff (without writing). Used by the UI to show
   * the confirmation dialog. Validation also catches malformed dates.
   */
  previewMove: async ({ request, params }) => {
    const fd = Object.fromEntries(await request.formData());
    const parsed = moveSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Daten.' });

    const { tasks: tRows, deps } = await getProjectTasksAndDeps(params.projectId);
    const engineTasks: EngineTask[] = tRows.map((t) => ({
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      durationAt: t.durationAt
    }));
    const engineDeps: EngineDep[] = deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type as 'FS' | 'SS' | 'FF' | 'SF',
      lagDays: d.lagDays
    }));

    const diff = propagate(engineTasks, engineDeps, {
      id: parsed.data.taskId,
      start: parsed.data.newStart,
      end: parsed.data.newEnd
    });

    const diffArr = Array.from(diff.entries()).map(([id, d]) => {
      const task = tRows.find((t) => t.id === id);
      return { id, name: task?.name ?? '', num: task?.num ?? '', ...d };
    });
    return { ok: true, diff: diffArr };
  },

  applyMove: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = moveSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Daten.' });

    const { tasks: tRows, deps } = await getProjectTasksAndDeps(params.projectId);
    const engineTasks: EngineTask[] = tRows.map((t) => ({ id: t.id, startDate: t.startDate, endDate: t.endDate, durationAt: t.durationAt }));
    const engineDeps: EngineDep[] = deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type as 'FS' | 'SS' | 'FF' | 'SF',
      lagDays: d.lagDays
    }));
    const diff = propagate(engineTasks, engineDeps, {
      id: parsed.data.taskId,
      start: parsed.data.newStart,
      end: parsed.data.newEnd
    });

    const root = tRows.find((t) => t.id === parsed.data.taskId);
    const updates = Array.from(diff.entries()).map(([id, d]) => ({ id, newStart: d.newStart, newEnd: d.newEnd }));
    if (updates.length === 0) {
      // The task itself didn't change relative to scheduled — but the form was submitted
      // because the user explicitly moved it. Apply the manual change anyway.
      updates.push({ id: parsed.data.taskId, newStart: parsed.data.newStart, newEnd: parsed.data.newEnd });
    }

    await applyTaskUpdates(params.projectId, updates, locals.user.id, root?.name ?? 'Termin');
    return { ok: true, count: updates.length };
  },

  saveTaskFields: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const id = String(fd.taskId ?? '');
    const name = String(fd.name ?? '').trim();
    const notes = String(fd.notes ?? '');
    const color = String(fd.color ?? '');
    if (!id) return fail(400);

    await db
      .update(tasks)
      .set({
        name: name || undefined,
        notes: notes || null,
        color: color || null,
        updatedAt: new Date()
      })
      .where(and(eq(tasks.id, id), eq(tasks.projectId, params.projectId)));

    return { ok: true };
  },

  freezeBaseline: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const label = String(fd.label ?? '').trim() ||
      `Stand ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

    const allTasks = await db
      .select({ id: tasks.id, startDate: tasks.startDate, endDate: tasks.endDate })
      .from(tasks)
      .where(eq(tasks.projectId, params.projectId));

    if (allTasks.length === 0) return fail(400, { error: 'Keine Termine zum Einfrieren.' });

    // Insert in batches of 100 to be safe
    for (let i = 0; i < allTasks.length; i += 100) {
      const batch = allTasks.slice(i, i + 100).map((t) => ({
        taskId: t.id,
        projectId: params.projectId,
        plannedStart: t.startDate,
        plannedEnd: t.endDate,
        snapshotLabel: label,
        createdBy: locals.user!.id
      }));
      await db.insert(taskBaselines).values(batch);
    }

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'baseline_frozen',
      message: `Baseline "${label}" eingefroren — ${allTasks.length} Termine`,
      refTable: 'task_baselines',
      refId: null
    });

    return { ok: true, label, count: allTasks.length };
  },

  baselineForLabel: async ({ request, params }) => {
    if (!db) return fail(500);
    const fd = Object.fromEntries(await request.formData());
    const label = String(fd.label ?? '');
    if (!label) return { ok: true, baseline: [] };
    const rows = await db
      .select({ taskId: taskBaselines.taskId, plannedStart: taskBaselines.plannedStart, plannedEnd: taskBaselines.plannedEnd })
      .from(taskBaselines)
      .where(and(eq(taskBaselines.projectId, params.projectId), eq(taskBaselines.snapshotLabel, label)));
    return { ok: true, baseline: rows };
  },

  /* ===== Dependency-Endpoints (PR #8) ===== */

  createDep: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const schema = z.object({
      predecessorId: z.string().uuid(),
      successorId: z.string().uuid(),
      type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS'),
      lagDays: z.coerce.number().int().min(-365).max(365).default(0)
    });
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });
    if (parsed.data.predecessorId === parsed.data.successorId) {
      return fail(400, { error: 'Pred und Succ sind identisch.' });
    }

    // Beide Tasks müssen ins selbe Projekt gehören (RLS schützt zusätzlich)
    const taskCheck = await db
      .select({ id: tasks.id, projectId: tasks.projectId })
      .from(tasks)
      .where(or(eq(tasks.id, parsed.data.predecessorId), eq(tasks.id, parsed.data.successorId)));
    if (taskCheck.length !== 2) return fail(404, { error: 'Termine nicht gefunden.' });
    if (!taskCheck.every((t) => t.projectId === params.projectId)) {
      return fail(403, { error: 'Termine außerhalb des Projekts.' });
    }

    // Idempotent: bei Duplikat updaten statt failen
    const existing = await db
      .select()
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.predecessorId, parsed.data.predecessorId),
          eq(taskDependencies.successorId, parsed.data.successorId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(taskDependencies)
        .set({ type: parsed.data.type, lagDays: parsed.data.lagDays })
        .where(eq(taskDependencies.id, existing[0].id));
      return { ok: true, depId: existing[0].id, updated: true };
    }

    const [row] = await db
      .insert(taskDependencies)
      .values({
        predecessorId: parsed.data.predecessorId,
        successorId: parsed.data.successorId,
        type: parsed.data.type,
        lagDays: parsed.data.lagDays
      })
      .returning();

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'dep_created',
      message: `Abhängigkeit angelegt: ${parsed.data.type}${parsed.data.lagDays ? ' Lag ' + parsed.data.lagDays + 'd' : ''}`,
      refTable: 'task_dependencies',
      refId: row.id
    });
    return { ok: true, depId: row.id };
  },

  updateDep: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const schema = z.object({
      depId: z.string().uuid(),
      type: z.enum(['FS', 'SS', 'FF', 'SF']),
      lagDays: z.coerce.number().int().min(-365).max(365)
    });
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return fail(400);

    // RLS schützt: nur deps deren tasks im Projekt sind sind sichtbar
    const dep = await db
      .select({ predecessorId: taskDependencies.predecessorId })
      .from(taskDependencies)
      .where(eq(taskDependencies.id, parsed.data.depId))
      .limit(1);
    if (dep.length === 0) return fail(404);

    await db
      .update(taskDependencies)
      .set({ type: parsed.data.type, lagDays: parsed.data.lagDays })
      .where(eq(taskDependencies.id, parsed.data.depId));
    return { ok: true };
  },

  deleteDep: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const schema = z.object({ depId: z.string().uuid() });
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return fail(400);

    await db.delete(taskDependencies).where(eq(taskDependencies.id, parsed.data.depId));
    return { ok: true };
  }
};
