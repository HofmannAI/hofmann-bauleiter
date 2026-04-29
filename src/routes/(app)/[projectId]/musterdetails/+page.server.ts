import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { musterdetails } from '$lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params, locals }) => {
  if (!db) return { items: [] };
  const rows = await db
    .select()
    .from(musterdetails)
    .where(eq(musterdetails.projectId, params.projectId))
    .orderBy(desc(musterdetails.createdAt));

  // Sign URLs server-side so the page renders immediately
  const withUrls = await Promise.all(
    rows.map(async (r) => {
      const { data } = await locals.supabase.storage.from('musterdetails').createSignedUrl(r.storagePath, 3600);
      return { ...r, signedUrl: data?.signedUrl ?? null };
    })
  );
  return { items: withUrls };
};

const linkSchema = z.object({
  label: z.string().min(1).max(160),
  storagePath: z.string().min(3).max(300)
});

export const actions: Actions = {
  link: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const parsed = linkSchema.safeParse(fd);
    if (!parsed.success) return fail(400, { error: 'Ungültig.' });
    await db.insert(musterdetails).values({
      projectId: params.projectId,
      label: parsed.data.label,
      storagePath: parsed.data.storagePath,
      uploadedBy: locals.user.id
    });
    return { ok: true };
  },

  delete: async ({ request, params, locals }) => {
    if (!locals.user || !db) return fail(401);
    const fd = Object.fromEntries(await request.formData());
    const id = String(fd.id ?? '');
    if (!id) return fail(400);
    const [row] = await db.select().from(musterdetails).where(eq(musterdetails.id, id)).limit(1);
    if (row && row.projectId === params.projectId) {
      await db.delete(musterdetails).where(and(eq(musterdetails.id, id), eq(musterdetails.projectId, params.projectId)));
      try { await locals.supabase.storage.from('musterdetails').remove([row.storagePath]); } catch (_e) { /* ignore */ }
    }
    return { ok: true };
  }
};
