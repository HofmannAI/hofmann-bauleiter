import { redirect, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { loadGaisbachSample } from '$lib/db/projectQueries';
import { getProjectTasksAndDeps, applyTaskUpdates } from '$lib/db/taskQueries';
import { propagate, type EngineTask, type EngineDep } from '$lib/gantt/engine';

export const load: PageServerLoad = async ({ params }) => {
  const { tasks: tRows, deps } = await getProjectTasksAndDeps(params.projectId);
  return { tasks: tRows, deps };
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
  }
};
