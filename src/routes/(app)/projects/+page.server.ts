import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/db/client';
import { projects, projectMembers, houses, apartments, tasks, checklistProgress } from '$lib/db/schema';
import { eq, sql, and, desc, inArray } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  if (!db || !locals.user) return { projects: [] };

  const memberships = await db
    .select({ projectId: projectMembers.projectId, role: projectMembers.role })
    .from(projectMembers)
    .where(eq(projectMembers.userId, locals.user.id));

  if (memberships.length === 0) return { projects: [] };

  const ids = memberships.map((m) => m.projectId);
  const rows = await db
    .select()
    .from(projects)
    .where(inArray(projects.id, ids))
    .orderBy(desc(projects.updatedAt));

  // Aggregate counts per project
  const enriched = await Promise.all(
    rows.map(async (p) => {
      const [hRow] = await db.select({ c: sql<number>`count(*)::int` }).from(houses).where(eq(houses.projectId, p.id));
      const [aRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(apartments)
        .innerJoin(houses, eq(houses.id, apartments.houseId))
        .where(eq(houses.projectId, p.id));
      const [tRow] = await db.select({ c: sql<number>`count(*)::int` }).from(tasks).where(eq(tasks.projectId, p.id));
      const [doneRow] = await db
        .select({ c: sql<number>`count(*)::int` })
        .from(checklistProgress)
        .where(and(eq(checklistProgress.projectId, p.id), eq(checklistProgress.done, true)));

      return {
        ...p,
        houseCount: hRow?.c ?? 0,
        apartmentCount: aRow?.c ?? 0,
        taskCount: tRow?.c ?? 0,
        checklistDone: doneRow?.c ?? 0
      };
    })
  );

  return { projects: enriched };
};

const DELETE_PASSWORD = 'hofmannhaus';

export const actions = {
  delete: async ({ request, locals }) => {
    if (!locals.user || !db) return fail(401);

    const fd = Object.fromEntries(await request.formData());
    const projectId = String(fd.projectId ?? '');
    const password = String(fd.password ?? '');

    if (!projectId) return fail(400, { error: 'Projekt-ID fehlt.' });
    if (password !== DELETE_PASSWORD) return fail(403, { error: 'Falsches Passwort.' });

    // Verify user is owner of this project
    const [membership] = await db
      .select({ role: projectMembers.role })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, locals.user.id)))
      .limit(1);

    if (!membership || membership.role !== 'owner') {
      return fail(403, { error: 'Nur Projekt-Eigentümer können Projekte löschen.' });
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    return { deleted: true };
  }
} satisfies Actions;
