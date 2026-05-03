import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { gewerke, defectPhotos, defectHistory, defects as defectsTable, defectLayouts, defectTemplates, tasks, projectMembers, profiles } from '$lib/db/schema';
import { listDefects, listPlans, listContactsForProject, createDefect } from '$lib/db/defectQueries';
import { loadStructureTree } from '$lib/db/structureQueries';
import { vorgaengeByProject } from '$lib/db/vorgangQueries';
import { asc, desc, sql, and, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const [defects, plans, contacts, gewerkeRows, vorgaengeMap, layouts, structure, templates, members] = await Promise.all([
    listDefects(params.projectId),
    listPlans(params.projectId),
    listContactsForProject(params.projectId),
    db ? db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)) : Promise.resolve([]),
    vorgaengeByProject(params.projectId),
    db
      ? db
          .select()
          .from(defectLayouts)
          .where(sql`${defectLayouts.projectId} IS NULL OR ${defectLayouts.projectId} = ${params.projectId}`)
          .orderBy(asc(defectLayouts.sortOrder), asc(defectLayouts.code))
      : Promise.resolve([]),
    loadStructureTree(params.projectId),
    db
      ? db
          .select()
          .from(defectTemplates)
          .orderBy(desc(defectTemplates.useCount), asc(defectTemplates.name))
      : Promise.resolve([]),
    db
      ? db
          .select({ id: profiles.id, name: profiles.name })
          .from(projectMembers)
          .innerJoin(profiles, eq(profiles.id, projectMembers.userId))
          .where(eq(projectMembers.projectId, params.projectId))
          .orderBy(asc(profiles.name))
      : Promise.resolve([])
  ]);
  // Reduce Map → array of {defectId, anStatus, agStatus, anTermin} for serialization
  const vorgaenge = Array.from(vorgaengeMap.entries()).map(([defectId, v]) => ({
    defectId,
    anStatus: v.AN?.status ?? null,
    anTermin: v.AN?.termin ?? null,
    agStatus: v.AG?.status ?? null
  }));
  return { defects, plans, contacts, gewerke: gewerkeRows, layouts, vorgaenge, structure, templates, members };
};

const photoEntry = z.object({
  storagePath: z.string().min(3).max(300),
  width: z.coerce.number().int().min(1).max(10000),
  height: z.coerce.number().int().min(1).max(10000)
});

const createSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  apartmentId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  priority: z.coerce.number().int().min(1).max(3).default(2),
  cost: z.coerce.number().min(0).optional().or(z.literal('').transform(() => undefined)),
  latitude: z.coerce.number().optional().or(z.literal('').transform(() => undefined)),
  longitude: z.coerce.number().optional().or(z.literal('').transform(() => undefined)),
  photos: z.string().optional() // JSON-serialized photoEntry[]
});

export const actions: Actions = {
  create: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = createSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Bitte Titel angeben.' });

    // Auto-link to matching task (same gewerk, closest to today)
    let autoTaskId: string | null = null;
    if (parsed.data.gewerkId && db) {
      const today = new Date().toISOString().slice(0, 10);
      const matchingTasks = await db
        .select({ id: tasks.id, startDate: tasks.startDate, endDate: tasks.endDate })
        .from(tasks)
        .where(and(eq(tasks.projectId, params.projectId), eq(tasks.gewerkId, parsed.data.gewerkId)))
        .orderBy(asc(tasks.startDate))
        .limit(10);
      // Prefer task whose range covers today, else closest upcoming, else most recent
      autoTaskId = matchingTasks.find(t => t.startDate <= today && t.endDate >= today)?.id
        ?? matchingTasks.find(t => t.startDate >= today)?.id
        ?? matchingTasks[matchingTasks.length - 1]?.id
        ?? null;
    }

    const row = await createDefect({
      projectId: params.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      gewerkId: parsed.data.gewerkId || null,
      apartmentId: parsed.data.apartmentId || null,
      contactId: parsed.data.contactId || null,
      taskId: autoTaskId,
      deadline: parsed.data.deadline || null,
      priority: parsed.data.priority,
      cost: parsed.data.cost ?? null,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      createdBy: locals.user.id
    });

    // Optional photos already uploaded to draft path — link them now
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
            details: { count: photos.length, source: 'create_sheet' }
          });
        }
      } catch (e) {
        console.warn('[create-with-photos] photos parse failed:', e);
      }
    }

    redirect(303, `/${params.projectId}/maengel/${row.id}`);
  },

  bulkSetStatus: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const ids = String(fd.ids ?? '').split(',').filter(Boolean);
    const status = String(fd.status ?? '') as 'open' | 'sent' | 'acknowledged' | 'resolved' | 'accepted' | 'rejected' | 'reopened';
    const valid = ['open', 'sent', 'acknowledged', 'resolved', 'accepted', 'rejected', 'reopened'];
    if (!valid.includes(status) || ids.length === 0) return fail(400);
    for (const id of ids) {
      await db.update(defectsTable)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(defectsTable.id, id), eq(defectsTable.projectId, params.projectId)));
    }
    return { ok: true, count: ids.length };
  },

  bulkUpdate: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const ids = String(fd.ids ?? '').split(',').filter(Boolean);
    if (ids.length === 0) return fail(400);

    const update: Record<string, unknown> = { updatedAt: new Date() };
    const deadline = String(fd.deadline ?? '');
    const contactId = String(fd.contactId ?? '');

    if (deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline)) update.deadline = deadline;
    if (contactId) update.contactId = contactId === '_clear' ? null : contactId;

    if (Object.keys(update).length <= 1) return fail(400); // only updatedAt = nothing useful

    for (const id of ids) {
      await db.update(defectsTable)
        .set(update)
        .where(and(eq(defectsTable.id, id), eq(defectsTable.projectId, params.projectId)));
    }
    return { ok: true, count: ids.length };
  },

  saveLayout: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const code = String(fd.code ?? '').slice(0, 16);
    const name = String(fd.name ?? '').slice(0, 100);
    const filterJson = String(fd.filterJson ?? '{}');
    const groupBy = (String(fd.groupBy ?? '') || null) as string | null;
    if (!code || !name) return fail(400, { error: 'Code + Name nötig.' });
    let parsed: unknown;
    try { parsed = JSON.parse(filterJson); } catch { return fail(400, { error: 'Filter-JSON ungültig.' }); }
    await db.insert(defectLayouts).values({
      projectId: params.projectId,
      code,
      name,
      filterJson: parsed as never,
      groupBy,
      isGlobal: false,
      createdBy: locals.user.id
    });
    return { ok: true };
  },

  applyTemplate: async ({ request, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const id = String(fd.id ?? '');
    if (!id) return fail(400);
    await db
      .update(defectTemplates)
      .set({ useCount: sql`${defectTemplates.useCount} + 1` })
      .where(eq(defectTemplates.id, id));
    return { ok: true };
  },

  bulkExtract: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const text = String(fd.text ?? '').trim();
    const gewerkId = (fd.gewerkId as string) || null;
    if (!text) return fail(400, { error: 'Bitte Text einfügen.' });

    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const created: string[] = [];
    for (const line of lines) {
      const row = await createDefect({
        projectId: params.projectId,
        title: line.slice(0, 160),
        description: line.length > 160 ? line : null,
        gewerkId,
        createdBy: locals.user.id,
        priority: 2
      });
      created.push(row.shortId ?? '');
    }
    return { ok: true, count: created.length };
  }
};
