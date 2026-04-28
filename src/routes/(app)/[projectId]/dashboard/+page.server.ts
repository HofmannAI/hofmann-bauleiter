import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import {
  checklists,
  checklistSections,
  checklistItems,
  checklistProgress,
  defects,
  tasks,
  activity,
  profiles
} from '$lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { stats: null, recent: [] };

  const projectId = params.projectId;

  // Total checklist items × scope instances
  // Simpler: count distinct (item, scopeKey) progress rows for this project
  const [doneRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(checklistProgress)
    .where(and(eq(checklistProgress.projectId, projectId), eq(checklistProgress.done, true)));

  const [openDefectsRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(defects)
    .where(and(eq(defects.projectId, projectId), sql`status NOT IN ('resolved','accepted','rejected')`));

  const [taskCountRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.projectId, projectId));

  const recentActivity = await db
    .select({
      id: activity.id,
      type: activity.type,
      message: activity.message,
      ts: activity.ts,
      userName: profiles.name
    })
    .from(activity)
    .leftJoin(profiles, eq(profiles.id, activity.userId))
    .where(eq(activity.projectId, projectId))
    .orderBy(desc(activity.ts))
    .limit(8);

  return {
    stats: {
      checklistsDone: doneRow?.c ?? 0,
      defectsOpen: openDefectsRow?.c ?? 0,
      taskCount: taskCountRow?.c ?? 0
    },
    recent: recentActivity
  };
};
