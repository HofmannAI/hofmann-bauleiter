import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { gewerke, defectPhotos, defectHistory } from '$lib/db/schema';
import { asc, inArray, eq, and } from 'drizzle-orm';
import { getPlan, createDefect, updateDefectFields } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params, locals }) => {
  const detail = await getPlan(params.projectId, params.planId);
  if (!detail) error(404, 'Plan nicht gefunden');
  if (!db) return { ...detail, signedUrl: null, gewerke: [], defectFirstPhoto: {} as Record<string, string> };

  const { data: signed } = await locals.supabase.storage.from('plans').createSignedUrl(detail.plan.storagePath, 3600);
  const gewerkeRows = await db.select().from(gewerke).orderBy(asc(gewerke.sortOrder));

  // First photo per defect (for preview card)
  const defectIds = detail.defects.map((d) => d.id);
  const defectFirstPhoto: Record<string, string> = {};
  if (defectIds.length > 0) {
    const photos = await db
      .select({ defectId: defectPhotos.defectId, storagePath: defectPhotos.storagePath })
      .from(defectPhotos)
      .where(inArray(defectPhotos.defectId, defectIds));
    for (const p of photos) {
      if (!defectFirstPhoto[p.defectId]) defectFirstPhoto[p.defectId] = p.storagePath;
    }
  }

  return { ...detail, signedUrl: signed?.signedUrl ?? null, gewerke: gewerkeRows, defectFirstPhoto };
};

const pinSchema = z.object({
  title: z.string().min(1).max(160),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).max(500),
  xPct: z.coerce.number().min(0).max(100),
  yPct: z.coerce.number().min(0).max(100),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  planCropPath: z.string().min(3).max(300).optional(),
  photos: z.string().optional()
});

const photoEntry = z.object({
  storagePath: z.string().min(3).max(300),
  width: z.coerce.number().int().min(1).max(10000),
  height: z.coerce.number().int().min(1).max(10000)
});

const movePinSchema = z.object({
  defectId: z.string().uuid(),
  xPct: z.coerce.number().min(0).max(100),
  yPct: z.coerce.number().min(0).max(100)
});

const setStatusSchema = z.object({
  defectId: z.string().uuid(),
  status: z.enum(['open', 'sent', 'acknowledged', 'resolved', 'accepted', 'rejected', 'reopened'])
});

export const actions: Actions = {
  createPin: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = pinSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    const row = await createDefect({
      projectId: params.projectId,
      title: parsed.data.title,
      gewerkId: parsed.data.gewerkId || null,
      planId: params.planId,
      page: parsed.data.page,
      xPct: parsed.data.xPct,
      yPct: parsed.data.yPct,
      priority: parsed.data.priority,
      planCropPath: parsed.data.planCropPath ?? null,
      createdBy: locals.user.id
    });

    if (parsed.data.photos) {
      try {
        const photos = z.array(photoEntry).max(20).parse(JSON.parse(parsed.data.photos));
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          await db.insert(defectPhotos).values({
            defectId: row.id,
            storagePath: p.storagePath,
            sortOrder: i,
            uploadedBy: locals.user.id
          });
        }
        if (photos.length > 0) {
          await db.insert(defectHistory).values({
            defectId: row.id,
            action: 'photo_added',
            byUser: locals.user.id,
            details: { count: photos.length, source: 'create_pin' }
          });
        }
      } catch (e) {
        console.warn('[createPin] photos parse failed:', e);
      }
    }
    return { ok: true };
  },

  movePin: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = movePinSchema.safeParse(fd);
    if (!parsed.success) return fail(400);
    // Direct update — RLS protects
    const { defects } = await import('$lib/db/schema');
    await db
      .update(defects)
      .set({ xPct: parsed.data.xPct.toString(), yPct: parsed.data.yPct.toString(), updatedAt: new Date() })
      .where(and(eq(defects.id, parsed.data.defectId), eq(defects.projectId, params.projectId)));
    return { ok: true };
  },

  setStatus: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = setStatusSchema.safeParse(fd);
    if (!parsed.success) return fail(400);
    await updateDefectFields(params.projectId, parsed.data.defectId, locals.user.id, { status: parsed.data.status });
    return { ok: true };
  }
};
