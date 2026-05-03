import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { defectPhotos, defectHistory, gewerke, contacts, textbausteine, tasks, taskDependencies } from '$lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { getDefect, updateDefectFields, listContactsForProject } from '$lib/db/defectQueries';
import { listVorgaenge, addVorgang, listBriefVorlagen, getFirmaSettings } from '$lib/db/vorgangQueries';

export const load: PageServerLoad = async ({ params }) => {
  const detail = await getDefect(params.projectId, params.defectId);
  if (!detail) error(404, 'Mangel nicht gefunden');
  if (!db) return { ...detail, gewerke: [], contacts: [], textbausteine: [], vorgaenge: [], briefVorlagen: [], firma: null, projectTasks: [], taskDeps: [] };

  const [gewerkeRows, contactsRows, textRows, vorgaenge, briefVorlagen, firma, projectTasks, taskDeps] = await Promise.all([
    db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)),
    listContactsForProject(params.projectId),
    db.select().from(textbausteine).orderBy(asc(textbausteine.sortOrder)),
    listVorgaenge(params.defectId),
    listBriefVorlagen(params.projectId),
    getFirmaSettings(),
    db.select({ id: tasks.id, name: tasks.name, num: tasks.num, gewerkId: tasks.gewerkId, endDate: tasks.endDate })
      .from(tasks)
      .where(eq(tasks.projectId, params.projectId))
      .orderBy(asc(tasks.sortOrder)),
    db.select({ predecessorId: taskDependencies.predecessorId, successorId: taskDependencies.successorId, type: taskDependencies.type })
      .from(taskDependencies)
  ]);

  return {
    ...detail,
    gewerke: gewerkeRows,
    contacts: contactsRows,
    textbausteine: textRows,
    vorgaenge,
    briefVorlagen,
    firma,
    projectTasks,
    taskDeps
  };
};

const fieldsSchema = z.object({
  title: z.string().max(160).optional(),
  description: z.string().max(4000).optional(),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  apartmentId: z.string().uuid().optional().or(z.literal('')),
  taskId: z.string().uuid().optional().or(z.literal('')),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  followupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  rechtsgrundlage: z.string().max(120).optional().or(z.literal('')),
  priority: z.coerce.number().int().min(1).max(3).optional(),
  status: z.enum(['open', 'sent', 'acknowledged', 'resolved', 'accepted', 'rejected', 'reopened']).optional(),
  externalId: z.string().max(100).optional().or(z.literal(''))
});

const photoLinkSchema = z.object({
  storagePath: z.string().min(3).max(300),
  caption: z.string().max(200).optional()
});

const vorgangSchema = z.object({
  partei: z.enum(['AN', 'AG']),
  status: z.enum([
    'erfasst',
    'angezeigt',
    'nachfrist',
    'klaerung',
    'freigemeldet_NU',
    'abgelehnt_NU',
    'kontrolle_AG',
    'erledigt',
    'ersatzvornahme',
    'notiz'
  ]),
  beschreibung: z.string().max(2000).optional().or(z.literal('')),
  termin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  terminAntwort: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal(''))
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
        if (['gewerkId', 'contactId', 'apartmentId', 'taskId', 'deadline', 'followupDate', 'externalId'].includes(k)) {
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
  },

  addVorgang: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = vorgangSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    const row = await addVorgang({
      defectId: params.defectId,
      partei: parsed.data.partei,
      status: parsed.data.status,
      beschreibung: parsed.data.beschreibung || null,
      termin: parsed.data.termin || null,
      terminAntwort: parsed.data.terminAntwort || null,
      createdBy: locals.user.id
    });
    return { ok: true, vorgangId: row?.id ?? null };
  },

  /**
   * Mängelrüge anzeigen: erzeugt einen Vorgang AN (status='angezeigt'),
   * setzt due_date und rechtsgrundlage am Mangel, hinterlegt das
   * Document-Reference falls vorhanden. PDF-Generierung passiert client-seitig
   * (siehe lib/pdf/maengelruege.ts) — der Server bekommt nur die Metadaten.
   */
  ruegeAnzeigen: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const schema = z.object({
      contactId: z.string().uuid().optional().or(z.literal('')),
      frist: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      rechtsgrundlage: z.string().max(120),
      vorlageId: z.string().uuid().optional().or(z.literal('')),
      documentId: z.string().max(120).optional()
    });
    const parsed = schema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    await updateDefectFields(params.projectId, params.defectId, locals.user.id, {
      contactId: parsed.data.contactId || null,
      dueDate: parsed.data.frist,
      rechtsgrundlage: parsed.data.rechtsgrundlage,
      status: 'sent'
    });

    await addVorgang({
      defectId: params.defectId,
      partei: 'AN',
      status: 'angezeigt',
      beschreibung: `Mängelrüge ${parsed.data.rechtsgrundlage} versendet, Frist ${parsed.data.frist}`,
      termin: parsed.data.frist,
      documentId: parsed.data.documentId ?? null,
      createdBy: locals.user.id
    });

    return { ok: true };
  }
};
