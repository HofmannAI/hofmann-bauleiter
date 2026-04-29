import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { contacts, gewerke } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { listContactsForProject } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params }) => {
  const [contactsRows, gewerkeRows] = await Promise.all([
    listContactsForProject(params.projectId),
    db ? db.select().from(gewerke).orderBy(asc(gewerke.sortOrder)) : Promise.resolve([])
  ]);
  return { contacts: contactsRows, gewerke: gewerkeRows };
};

const contactSchema = z.object({
  id: z.string().uuid().optional().or(z.literal('')),
  gewerkId: z.string().uuid().optional().or(z.literal('')),
  company: z.string().max(160).optional(),
  contactName: z.string().max(160).optional(),
  email: z.string().email().max(254).optional().or(z.literal('')),
  phone: z.string().max(60).optional(),
  address: z.string().max(300).optional(),
  notes: z.string().max(1000).optional()
});

export const actions: Actions = {
  upsert: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = contactSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültige Eingabe.' });

    const values = {
      projectId: params.projectId,
      gewerkId: parsed.data.gewerkId || null,
      company: parsed.data.company || null,
      contactName: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      notes: parsed.data.notes || null
    };

    if (parsed.data.id) {
      await db
        .update(contacts)
        .set({ ...values, updatedAt: new Date() })
        .where(and(eq(contacts.id, parsed.data.id), eq(contacts.projectId, params.projectId)));
    } else {
      await db.insert(contacts).values(values);
    }
    return { ok: true };
  },

  delete: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const id = String(fd.id ?? '');
    if (!id) return fail(400);
    await db.delete(contacts).where(and(eq(contacts.id, id), eq(contacts.projectId, params.projectId)));
    return { ok: true };
  }
};
