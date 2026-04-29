import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { db } from '$lib/db/client';
import { projects, houses, apartments, projectMembers } from '$lib/db/schema';
import { eq, and, asc } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ params, locals }) => {
  if (!db || !locals.user) error(401, 'Nicht angemeldet');

  const member = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, params.projectId), eq(projectMembers.userId, locals.user.id)))
    .limit(1);
  if (member.length === 0) error(403, 'Kein Zugriff auf dieses Projekt');

  const [project] = await db.select().from(projects).where(eq(projects.id, params.projectId)).limit(1);
  if (!project) error(404, 'Projekt nicht gefunden');

  const houseRows = await db
    .select()
    .from(houses)
    .where(eq(houses.projectId, params.projectId))
    .orderBy(asc(houses.sortOrder));

  const apts = await Promise.all(
    houseRows.map(async (h) => ({
      ...h,
      apartments: await db.select().from(apartments).where(eq(apartments.houseId, h.id)).orderBy(asc(apartments.sortOrder))
    }))
  );

  return { project, houses: apts };
};
