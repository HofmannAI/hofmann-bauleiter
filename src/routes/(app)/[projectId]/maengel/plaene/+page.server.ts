import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { plans } from '$lib/db/schema';
import { listPlans } from '$lib/db/defectQueries';

export const load: PageServerLoad = async ({ params }) => {
  const planRows = await listPlans(params.projectId);
  return { plans: planRows };
};

const createSchema = z.object({
  name: z.string().min(1).max(120),
  storagePath: z.string().min(3).max(300),
  pageCount: z.coerce.number().int().min(1).max(500).default(1)
});

export const actions: Actions = {
  create: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = createSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Bitte Datei + Namen angeben.' });

    const [row] = await db
      .insert(plans)
      .values({
        projectId: params.projectId,
        name: parsed.data.name,
        version: 1,
        storagePath: parsed.data.storagePath,
        pageCount: parsed.data.pageCount,
        uploadedBy: locals.user.id
      })
      .returning();
    redirect(303, `/${params.projectId}/maengel/plaene/${row.id}`);
  }
};
