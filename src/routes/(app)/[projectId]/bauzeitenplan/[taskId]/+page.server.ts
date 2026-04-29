import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, activity } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getTaskWithApartmentProgress, setApartmentProgress } from '$lib/db/taskQueries';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getTaskWithApartmentProgress(params.projectId, params.taskId);
  if (!detail) error(404, 'Termin nicht gefunden');
  return detail;
};

const aptProgressSchema = z.object({
  apartmentId: z.string().uuid(),
  done: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  doneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  plannedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  notes: z.string().max(2000).optional()
});

export const actions: Actions = {
  saveFields: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const name = String(fd.name ?? '').trim();
    const notes = String(fd.notes ?? '');
    const color = String(fd.color ?? '');
    if (!name) return fail(400, { error: 'Name darf nicht leer sein.' });

    await db
      .update(tasks)
      .set({ name, notes: notes || null, color: color || null, updatedAt: new Date() })
      .where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.projectId)));

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'task_edit',
      message: `Termin "${name}" bearbeitet`,
      refTable: 'tasks',
      refId: params.taskId
    });
    return { ok: true };
  },

  setApartment: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = aptProgressSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    await setApartmentProgress({
      projectId: params.projectId,
      taskId: params.taskId,
      apartmentId: parsed.data.apartmentId,
      done: parsed.data.done,
      doneDate: parsed.data.doneDate === '' ? null : parsed.data.doneDate,
      plannedStart: parsed.data.plannedStart === '' ? null : parsed.data.plannedStart,
      plannedEnd: parsed.data.plannedEnd === '' ? null : parsed.data.plannedEnd,
      notes: parsed.data.notes,
      doneBy: locals.user.id
    });
    return { ok: true };
  },

  delete: async ({ params, locals }) => {
    if (!locals.user || !db) return fail(401);
    await db.delete(tasks).where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.projectId)));
    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'task_delete',
      message: 'Termin gelöscht',
      refTable: 'tasks',
      refId: params.taskId
    });
    return { ok: true, deleted: true };
  }
};
