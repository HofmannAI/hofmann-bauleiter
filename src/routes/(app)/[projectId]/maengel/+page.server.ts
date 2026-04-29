import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { gewerke } from '$lib/db/schema';
import { listDefects, listPlans, listContactsForProject, createDefect } from '$lib/db/defectQueries';
import { asc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  const [defects, plans, contacts, gewerkeRows] = await Promise.all([
    listDefects(params.projectId),
    listPlans(params.projectId),
    listContactsForProject(params.projectId),
    db ? db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)) : Promise.resolve([])
  ]);
  return { defects, plans, contacts, gewerke: gewerkeRows };
};

const createSchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  apartmentId: z.string().uuid().optional().or(z.literal('')),
  contactId: z.string().uuid().optional().or(z.literal('')),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  priority: z.coerce.number().int().min(1).max(3).default(2)
});

export const actions: Actions = {
  create: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = createSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Bitte Titel angeben.' });

    const row = await createDefect({
      projectId: params.projectId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      gewerkId: parsed.data.gewerkId || null,
      apartmentId: parsed.data.apartmentId || null,
      contactId: parsed.data.contactId || null,
      deadline: parsed.data.deadline || null,
      priority: parsed.data.priority,
      createdBy: locals.user.id
    });
    redirect(303, `/${params.projectId}/maengel/${row.id}`);
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
