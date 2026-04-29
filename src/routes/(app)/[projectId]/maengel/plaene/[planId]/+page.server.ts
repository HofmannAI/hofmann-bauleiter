import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { gewerke } from '$lib/db/schema';
import { asc } from 'drizzle-orm';
import { getPlan, createDefect } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params, locals }) => {
  const detail = await getPlan(params.projectId, params.planId);
  if (!detail) error(404, 'Plan nicht gefunden');
  if (!db) return { ...detail, signedUrl: null, gewerke: [] };

  const { data: signed } = await locals.supabase.storage.from('plans').createSignedUrl(detail.plan.storagePath, 3600);
  const gewerkeRows = await db.select().from(gewerke).orderBy(asc(gewerke.sortOrder));
  return { ...detail, signedUrl: signed?.signedUrl ?? null, gewerke: gewerkeRows };
};

const pinSchema = z.object({
  title: z.string().min(1).max(160),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  page: z.coerce.number().int().min(1).max(500),
  xPct: z.coerce.number().min(0).max(100),
  yPct: z.coerce.number().min(0).max(100),
  priority: z.coerce.number().int().min(1).max(3).default(2)
});

export const actions: Actions = {
  createPin: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = pinSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    await createDefect({
      projectId: params.projectId,
      title: parsed.data.title,
      gewerkId: parsed.data.gewerkId || null,
      planId: params.planId,
      page: parsed.data.page,
      xPct: parsed.data.xPct,
      yPct: parsed.data.yPct,
      priority: parsed.data.priority,
      createdBy: locals.user.id
    });
    return { ok: true };
  }
};

