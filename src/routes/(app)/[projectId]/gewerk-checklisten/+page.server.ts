import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { gewerke, apartments, houses, gewerkChecklistTemplates, gewerkChecklistProgress, activity } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { gewerke: [], apartments: [], templates: [], progress: {} as Record<string, { done: boolean; doneDate: string | null }> };

  const [gewerkeRows, houseRows, allTemplates, allProgress] = await Promise.all([
    db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)),
    db.select().from(houses).where(eq(houses.projectId, params.projectId)).orderBy(asc(houses.sortOrder)),
    db.select().from(gewerkChecklistTemplates).orderBy(asc(gewerkChecklistTemplates.sortOrder)),
    db.select().from(gewerkChecklistProgress).where(eq(gewerkChecklistProgress.projectId, params.projectId))
  ]);

  const aptList: { id: string; name: string; houseName: string; houseId: string }[] = [];
  for (const h of houseRows) {
    const apts = await db.select().from(apartments).where(eq(apartments.houseId, h.id)).orderBy(asc(apartments.sortOrder));
    apts.forEach((a) => aptList.push({ id: a.id, name: a.name, houseName: h.name, houseId: h.id }));
  }

  // progress map keyed by `${gewerkId}|${apartmentId}|${templateId}` → row
  const progress: Record<string, { done: boolean; doneDate: string | null; notes: string | null }> = {};
  for (const p of allProgress) {
    progress[`${p.gewerkId}|${p.apartmentId}|${p.templateId}`] = {
      done: p.done,
      doneDate: p.doneDate,
      notes: p.notes
    };
  }

  return { gewerke: gewerkeRows, apartments: aptList, templates: allTemplates, progress };
};

const setSchema = z.object({
  gewerkId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  templateId: z.string().uuid(),
  done: z.enum(['true', 'false']).transform((v) => v === 'true')
});

export const actions: Actions = {
  set: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = setSchema.safeParse(fd);
    if (!parsed.success) return fail(400);

    const existing = await db
      .select()
      .from(gewerkChecklistProgress)
      .where(
        and(
          eq(gewerkChecklistProgress.projectId, params.projectId),
          eq(gewerkChecklistProgress.gewerkId, parsed.data.gewerkId),
          eq(gewerkChecklistProgress.apartmentId, parsed.data.apartmentId),
          eq(gewerkChecklistProgress.templateId, parsed.data.templateId)
        )
      )
      .limit(1);

    const today = new Date().toISOString().slice(0, 10);
    if (existing.length === 0) {
      await db.insert(gewerkChecklistProgress).values({
        projectId: params.projectId,
        gewerkId: parsed.data.gewerkId,
        apartmentId: parsed.data.apartmentId,
        templateId: parsed.data.templateId,
        done: parsed.data.done,
        doneDate: parsed.data.done ? today : null,
        doneBy: parsed.data.done ? locals.user.id : null
      });
    } else {
      await db
        .update(gewerkChecklistProgress)
        .set({
          done: parsed.data.done,
          doneDate: parsed.data.done ? today : null,
          doneBy: parsed.data.done ? locals.user.id : null,
          updatedAt: new Date()
        })
        .where(eq(gewerkChecklistProgress.id, existing[0].id));
    }

    await db.insert(activity).values({
      projectId: params.projectId,
      userId: locals.user.id,
      type: 'gewerk_check',
      message: `Gewerk-Checkliste: ${parsed.data.done ? 'erledigt' : 'zurückgesetzt'}`,
      refTable: 'gewerk_checklist_progress',
      refId: parsed.data.templateId
    });
    return { ok: true };
  }
};
