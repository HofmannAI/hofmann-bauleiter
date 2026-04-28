import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { activity, profiles } from '$lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { entries: [] };
  const entries = await db
    .select({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      ts: activity.ts,
      userName: profiles.name
    })
    .from(activity)
    .leftJoin(profiles, eq(profiles.id, activity.userId))
    .where(eq(activity.projectId, params.projectId))
    .orderBy(desc(activity.ts))
    .limit(200);
  return { entries };
};
