import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { createProject } from '$lib/db/projectQueries';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(303, '/login');
  return {};
};

const houseSchema = z.object({
  name: z.string().min(1).max(80),
  apartmentCount: z.coerce.number().int().min(0).max(40)
});

const schema = z.object({
  template: z.enum(['empty', 'sample']),
  name: z.string().min(2).max(120),
  an: z.string().max(120).default('Hofmann Haus'),
  houses: z.array(houseSchema).min(1).max(10)
});

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!locals.user) return fail(401, { error: 'Nicht angemeldet.' });

    const fd = await request.formData();
    const template = (fd.get('template') as string) ?? 'empty';
    const name = ((fd.get('name') as string) ?? '').trim();
    const an = ((fd.get('an') as string) ?? 'Hofmann Haus').trim();

    const houseEntries: { name: string; apartmentCount: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const hn = fd.get(`house_${i}_name`);
      if (!hn) break;
      const ac = parseInt((fd.get(`house_${i}_apts`) as string) ?? '0', 10) || 0;
      houseEntries.push({ name: String(hn), apartmentCount: ac });
    }

    const parsed = schema.safeParse({ template, name, an, houses: houseEntries });
    if (!parsed.success) {
      return fail(400, { error: 'Bitte alle Felder ausfüllen.', name, an });
    }

    const houses = parsed.data.houses.map((h) => ({
      name: h.name,
      apartments: Array.from({ length: h.apartmentCount }, (_, i) => ({ name: `Wohnung ${i + 1}` }))
    }));

    try {
      const projectId = await createProject({
        name: parsed.data.name,
        an: parsed.data.an,
        ownerId: locals.user.id,
        houses,
        template: parsed.data.template
      });
      redirect(303, `/${projectId}/dashboard`);
    } catch (err) {
      // SvelteKit's redirect throws — let it bubble
      if (err instanceof Response || (err as { status?: number })?.status === 303) throw err;
      console.error('[projects/new] create failed:', err);
      return fail(500, { error: 'Anlage fehlgeschlagen — bitte später nochmal.' });
    }
  }
};
