import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { activity, checklistItems, checklistPhotos, checklistProgress } from '$lib/db/schema';
import { loadChecklistDetail, setProgress } from '$lib/db/checklistQueries';
import { eq, and } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await loadChecklistDetail(params.projectId, params.checklistId);
  if (!detail) error(404, 'Checkliste nicht gefunden');

  // Group items by section, project to plain objects (Map isn't serializable)
  const progressByKey = Object.fromEntries(detail.progressMap);
  return {
    checklist: detail.checklist,
    sections: detail.sections,
    items: detail.items,
    instances: detail.instances,
    progress: progressByKey
  };
};

const toggleSchema = z.object({
  itemId: z.string().uuid(),
  scopeKey: z.string().min(1).max(120),
  done: z.enum(['true', 'false']).transform((v) => v === 'true')
});

const saveFieldsSchema = z.object({
  itemId: z.string().uuid(),
  scopeKey: z.string().min(1).max(120),
  notes: z.string().max(2000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')).optional()
});

const photoLinkSchema = z.object({
  itemId: z.string().uuid(),
  scopeKey: z.string().min(1).max(120),
  storagePath: z.string().min(3).max(300),
  width: z.coerce.number().int().min(1).max(10000),
  height: z.coerce.number().int().min(1).max(10000)
});

const photoDeleteSchema = z.object({ photoId: z.string().uuid() });

export const actions: Actions = {
  toggle: async ({ request, locals, params }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = toggleSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    const row = await setProgress({
      projectId: params.projectId,
      itemId: parsed.data.itemId,
      scopeKey: parsed.data.scopeKey,
      done: parsed.data.done,
      doneBy: locals.user.id
    });

    // Activity log
    const [item] = await db.select().from(checklistItems).where(eq(checklistItems.id, parsed.data.itemId)).limit(1);
    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'check',
      message: `${parsed.data.done ? 'Erledigt' : 'Zurückgesetzt'}: ${item?.text?.slice(0, 80) ?? ''}`,
      refTable: 'checklist_progress',
      refId: row.id
    });
    return { ok: true };
  },

  saveFields: async ({ request, locals, params }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = saveFieldsSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    await setProgress({
      projectId: params.projectId,
      itemId: parsed.data.itemId,
      scopeKey: parsed.data.scopeKey,
      notes: parsed.data.notes ?? null,
      doneDate: parsed.data.date === '' ? null : parsed.data.date ?? null
    });
    return { ok: true };
  },

  linkPhoto: async ({ request, locals, params }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = photoLinkSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Foto-Daten.' });

    // Ensure progress row exists
    const row = await setProgress({
      projectId: params.projectId,
      itemId: parsed.data.itemId,
      scopeKey: parsed.data.scopeKey
    });

    const [photo] = await db
      .insert(checklistPhotos)
      .values({
        progressId: row.id,
        storagePath: parsed.data.storagePath,
        width: parsed.data.width,
        height: parsed.data.height,
        uploadedBy: locals.user.id
      })
      .returning();

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'photo',
      message: 'Foto angehängt an Checkliste',
      refTable: 'checklist_photos',
      refId: photo.id
    });
    return { ok: true, photoId: photo.id };
  },

  deletePhoto: async ({ request, locals, params }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = photoDeleteSchema.safeParse(fd);
    if (!parsed.success) return fail(400);

    // Look up storage path so we can delete from storage too
    const [photo] = await db.select().from(checklistPhotos).where(eq(checklistPhotos.id, parsed.data.photoId)).limit(1);
    if (!photo) return fail(404);

    // Verify the photo belongs to a progress row in THIS project (RLS protects, but be explicit)
    const [pr] = await db
      .select()
      .from(checklistProgress)
      .where(and(eq(checklistProgress.id, photo.progressId), eq(checklistProgress.projectId, params.projectId)))
      .limit(1);
    if (!pr) return fail(403);

    await db.delete(checklistPhotos).where(eq(checklistPhotos.id, photo.id));
    // Also remove from storage. Use service-role client to bypass RLS on storage.
    try {
      await locals.supabase.storage.from('checklist-photos').remove([photo.storagePath]);
    } catch (e) {
      console.warn('[checklist] storage delete failed:', e);
    }
    return { ok: true };
  }
};
