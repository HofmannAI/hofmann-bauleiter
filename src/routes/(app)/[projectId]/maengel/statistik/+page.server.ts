import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { defects, gewerke, contacts } from '$lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { rows: [], gewerkRows: [], contactRows: [] };
  const [rows, gewerkRows, contactRows] = await Promise.all([
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
      .where(sql`${contacts.projectId} = ${params.projectId} OR ${contacts.projectId} IS NULL`)
  ]);
  return { rows, gewerkRows, contactRows };
};
