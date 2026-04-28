import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { projects, projectMembers, houses, apartments, tasks, checklistProgress } from '$lib/db/schema';
import { eq, sql, and, desc, inArray } from 'drizzle-orm';

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
