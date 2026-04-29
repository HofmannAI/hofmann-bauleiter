import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { defectPhotos, defectHistory, gewerke, contacts } from '$lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getDefect, updateDefectFields, listContactsForProject } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getDefect(params.projectId, params.defectId);
  if (!detail) error(404, 'Mangel nicht gefunden');
  if (!db) return { ...detail, gewerke: [], contacts: [] };

  const [gewerkeRows, contactsRows] = await Promise.all([
    db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)),
    listContactsForProject(params.projectId)
  ]);

  return { ...detail, gewerke: gewerkeRows, contacts: contactsRows };
};

const fieldsSchema = z.object({
  title: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  apartmentId: z.string().uuid().optional().or(z.literal('')),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  followupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  status: z.enum(['open', 'sent', 'acknowledged', 'resolved', 'accepted', 'rejected', 'reopened']).optional()
});

const photoLinkSchema = z.object({
  storagePath: z.string().min(3).max(300),
  caption: z.string().max(200).optional()
});

export const actions: Actions = {
  saveFields: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = fieldsSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v === '' || v === undefined) {
        if (['gewerkId', 'contactId', 'apartmentId', 'deadline', 'followupDate'].includes(k)) {
          fields[k] = null;
        }
      } else {
        fields[k] = v;
      }
    }

    await updateDefectFields(params.projectId, params.defectId, locals.user.id, fields);
    return { ok: true };
  },

  linkPhoto: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = photoLinkSchema.safeParse(fd);
    if (!parsed.success) return fail(400);

    const [row] = await db
      .insert(defectPhotos)
      .values({
        defectId: params.defectId,
        storagePath: parsed.data.storagePath,
        caption: parsed.data.caption ?? null,
        uploadedBy: locals.user.id
      })
      .returning();

    await db.insert(defectHistory).values({
      defectId: params.defectId,
      action: 'photo_added',
      byUser: locals.user.id,
      details: { storagePath: parsed.data.storagePath }
    });
    return { ok: true, photoId: row.id };
  },

  deletePhoto: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const photoId = String(fd.photoId ?? '');
    if (!photoId) return fail(400);

    const [photo] = await db.select().from(defectPhotos).where(eq(defectPhotos.id, photoId)).limit(1);
    if (!photo) return fail(404);

    await db.delete(defectPhotos).where(eq(defectPhotos.id, photoId));
    try { await locals.supabase.storage.from('defect-photos').remove([photo.storagePath]); } catch (_e) { /* ignore */ }
    return { ok: true };
  }
};
