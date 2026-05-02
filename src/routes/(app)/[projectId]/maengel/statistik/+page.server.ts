import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { defects, gewerke, contacts, tasks } from '$lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { rows: [], gewerkRows: [], contactRows: [], lostDaysData: [] };
  const [rows, gewerkRows, contactRows, lostDaysData] = await Promise.all([
    db
      .select({
        id: defects.id,
        status: defects.status,
        priority: defects.priority,
        gewerkId: defects.gewerkId,
        contactId: defects.contactId,
        deadline: defects.deadline,
        createdAt: defects.createdAt,
        resolvedAt: defects.resolvedAt
      })
      .from(defects)
      .where(eq(defects.projectId, params.projectId)),
    db.select({ id: gewerke.id, name: gewerke.name, color: gewerke.color }).from(gewerke),
    db
      .select({ id: contacts.id, company: contacts.company })
      .from(contacts)
      .where(sql`${contacts.projectId} = ${params.projectId} OR ${contacts.projectId} IS NULL`),
    // Lost days: for each task with linked defects, calculate delay
    db.select({
      taskId: tasks.id,
      taskEndDate: tasks.endDate,
      gewerkId: tasks.gewerkId,
      latestResolvedAt: sql<string | null>`max(${defects.resolvedAt})::text`,
      openCount: sql<number>`count(*) FILTER (WHERE ${defects.status} NOT IN ('resolved', 'accepted', 'rejected'))::int`
    })
      .from(tasks)
      .innerJoin(defects, eq(defects.taskId, tasks.id))
      .where(eq(tasks.projectId, params.projectId))
      .groupBy(tasks.id, tasks.endDate, tasks.gewerkId)
  ]);
  return { rows, gewerkRows, contactRows, lostDaysData };
};
