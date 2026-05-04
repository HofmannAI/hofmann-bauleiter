import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, activity, taskPhotos, defects, freimeldungTokens } from '$lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getTaskWithApartmentProgress, setApartmentProgress } from '$lib/db/taskQueries';
import { listDefectsForTask, createDefect, updateDefectFields } from '$lib/db/defectQueries';

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
    const reminderDate = String(fd.reminderDate ?? '');
    if (!name) return fail(400, { error: 'Name darf nicht leer sein.' });

    await db
      .update(tasks)
      .set({
        name,
        notes: notes || null,
        color: color || null,
        reminderDate: reminderDate || null,
        updatedAt: new Date()
      })
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

  setActualDates: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const schema = z.object({
      actualStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
      actualEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''))
    });
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültiges Datum.' });

    const update: Record<string, unknown> = { updatedAt: new Date() };
    update.actualStartDate = parsed.data.actualStartDate || null;
    update.actualEndDate = parsed.data.actualEndDate || null;

    await db
      .update(tasks)
      .set(update)
      .where(and(eq(tasks.id, params.taskId), eq(tasks.projectId, params.projectId)));

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'task_feedback',
      message: `Rückmeldung: Ist-Start ${parsed.data.actualStartDate || '—'}, Ist-Ende ${parsed.data.actualEndDate || '—'}`,
      refTable: 'tasks',
      refId: params.taskId
    });
    return { ok: true };
  },

  createDefect: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const title = String(fd.title ?? '').trim();
    const priority = parseInt(String(fd.priority ?? '2')) || 2;
    if (!title) return fail(400, { error: 'Titel fehlt.' });

    // Get task's gewerkId to auto-assign
    const [task] = await db.select({ gewerkId: tasks.gewerkId }).from(tasks).where(eq(tasks.id, params.taskId)).limit(1);

    await createDefect({
      projectId: params.projectId,
      title: title.slice(0, 160),
      gewerkId: task?.gewerkId ?? null,
      taskId: params.taskId,
      priority,
      createdBy: locals.user.id
    });
    return { ok: true };
  },

  resolveDefect: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const defectId = String(fd.defectId ?? '');
    const status = String(fd.status ?? 'resolved');
    if (!defectId) return fail(400);

    await updateDefectFields(params.projectId, defectId, locals.user.id, {
      status: status as 'resolved'
    });
    return { ok: true };
  },

  createQrToken: async ({ params, locals, url }) => {
    if (!locals.user || !db) return fail(401);

    // Create freimeldung token
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
    const tokenValue = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

    const [row] = await db.insert(freimeldungTokens).values({
      projectId: params.projectId,
      taskId: params.taskId,
      token: tokenValue,
      expiresAt
    }).returning({ token: freimeldungTokens.token });

    const baseUrl = url.origin;
    const link = `${baseUrl}/freimeldung/${row.token}`;

    return { ok: true, qrLink: link };
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
