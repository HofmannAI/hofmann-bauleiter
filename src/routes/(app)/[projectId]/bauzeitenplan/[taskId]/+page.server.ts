import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, activity, taskPhotos } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getTaskWithApartmentProgress, setApartmentProgress } from '$lib/db/taskQueries';
import { listDefectsForTask } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getTaskWithApartmentProgress(params.projectId, params.taskId);
  if (!detail) error(404, 'Termin nicht gefunden');
  if (!db) return { ...detail, photos: [], linkedDefects: [] };
  const [photos, linkedDefects] = await Promise.all([
    db
      .select()
      .from(taskPhotos)
      .where(eq(taskPhotos.taskId, params.taskId))
      .orderBy(asc(taskPhotos.sortOrder), asc(taskPhotos.createdAt)),
    listDefectsForTask(params.taskId)
  ]);
  return { ...detail, photos, linkedDefects };
};

const aptProgressSchema = z.object({
  apartmentId: z.string().uuid(),
  done: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  doneDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  plannedStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  plannedEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional(),
  notes: z.string().max(2000).optional()
});

const linkPhotoSchema = z.object({
  storagePath: z.string().min(3).max(300),
  caption: z.string().max(200).optional()
});

const deletePhotoSchema = z.object({ photoId: z.string().uuid() });

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

  setProgress: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = z.object({ pct: z.coerce.number().int().min(0).max(100) }).safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültiger Wert.' });

    const [row] = await db
      .update(tasks)
      .set({ progressPct: parsed.data.pct, updatedAt: new Date() })
      .where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.projectId)))
      .returning({ name: tasks.name });
    if (!row) return fail(404);

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'task_edit',
      message: `Termin "${row.name}" auf ${parsed.data.pct}% gesetzt`,
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

  linkPhoto: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = linkPhotoSchema.safeParse(fd);
    if (!parsed.success) return fail(400);
    // sort_order = current count
    const existing = await db.select({ id: taskPhotos.id }).from(taskPhotos).where(eq(taskPhotos.taskId, params.taskId));
    await db.insert(taskPhotos).values({
      taskId: params.taskId,
      storagePath: parsed.data.storagePath,
      caption: parsed.data.caption ?? null,
      sortOrder: existing.length,
      uploadedBy: locals.user.id
    });
    return { ok: true };
  },

  deletePhoto: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = deletePhotoSchema.safeParse(fd);
    if (!parsed.success) return fail(400);
    const [row] = await db.select().from(taskPhotos).where(eq(taskPhotos.id, parsed.data.photoId)).limit(1);
    if (!row) return fail(404);
    await db.delete(taskPhotos).where(eq(taskPhotos.id, parsed.data.photoId));
    try { await locals.supabase.storage.from('task-photos').remove([row.storagePath]); } catch (_e) { /* best effort */ }
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
