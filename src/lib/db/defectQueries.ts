import { db } from './client';
import {
  defects,
  defectPhotos,
  defectHistory,
  plans,
  contacts,
  gewerke,
  apartments,
  houses,
  activity
} from './schema';
import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';

export async function listDefects(projectId: string) {
  if (!db) return [];
  return await db
    .select({
      id: defects.id,
      shortId: defects.shortId,
      title: defects.title,
      status: defects.status,
      priority: defects.priority,
      deadline: defects.deadline,
      followupDate: defects.followupDate,
      gewerkId: defects.gewerkId,
      gewerkName: gewerke.name,
      gewerkColor: gewerke.color,
      apartmentId: defects.apartmentId,
      planId: defects.planId,
      page: defects.page,
      xPct: defects.xPct,
      yPct: defects.yPct,
      createdAt: defects.createdAt
    })
    .from(defects)
    .leftJoin(gewerke, eq(gewerke.id, defects.gewerkId))
    .where(eq(defects.projectId, projectId))
    .orderBy(asc(defects.shortId));
}

export async function getDefect(projectId: string, defectId: string) {
  if (!db) return null;
  const [d] = await db
    .select()
    .from(defects)
    .where(and(eq(defects.id, defectId), eq(defects.projectId, projectId)))
    .limit(1);
  if (!d) return null;

  const [g] = d.gewerkId ? await db.select().from(gewerke).where(eq(gewerke.id, d.gewerkId)).limit(1) : [null];
  const [c] = d.contactId ? await db.select().from(contacts).where(eq(contacts.id, d.contactId)).limit(1) : [null];
  const [p] = d.planId ? await db.select().from(plans).where(eq(plans.id, d.planId)).limit(1) : [null];
  const [a] = d.apartmentId ? await db.select().from(apartments).where(eq(apartments.id, d.apartmentId)).limit(1) : [null];

  const photos = await db.select().from(defectPhotos).where(eq(defectPhotos.defectId, d.id));
  const history = await db.select().from(defectHistory).where(eq(defectHistory.defectId, d.id)).orderBy(desc(defectHistory.createdAt));

  return { defect: d, gewerk: g, contact: c, plan: p, apartment: a, photos, history };
}

/**
 * Auto-generate next short_id for a project (M-001, M-002, …).
 * Looks at max existing M-### within the project and returns the next.
 */
export async function nextShortId(projectId: string): Promise<string> {
  if (!db) return 'M-001';
  const rows = await db
    .select({ shortId: defects.shortId })
    .from(defects)
    .where(eq(defects.projectId, projectId));
  let max = 0;
  for (const r of rows) {
    const m = (r.shortId ?? '').match(/^M-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `M-${String(max + 1).padStart(3, '0')}`;
}

export type CreateDefectInput = {
  projectId: string;
  title: string;
  description?: string | null;
  gewerkId?: string | null;
  contactId?: string | null;
  apartmentId?: string | null;
  planId?: string | null;
  page?: number | null;
  xPct?: number | null;
  yPct?: number | null;
  deadline?: string | null;
  priority?: number;
  createdBy: string;
};

export async function createDefect(input: CreateDefectInput) {
  if (!db) throw new Error('db not initialized');
  const shortId = await nextShortId(input.projectId);
  const [row] = await db
    .insert(defects)
    .values({
      projectId: input.projectId,
      shortId,
      title: input.title,
      description: input.description ?? null,
      gewerkId: input.gewerkId ?? null,
      contactId: input.contactId ?? null,
      apartmentId: input.apartmentId ?? null,
      planId: input.planId ?? null,
      page: input.page ?? null,
      xPct: input.xPct != null ? input.xPct.toString() : null,
      yPct: input.yPct != null ? input.yPct.toString() : null,
      deadline: input.deadline ?? null,
      priority: input.priority ?? 2,
      status: 'open',
      createdBy: input.createdBy
    })
    .returning();

  await db.insert(defectHistory).values({
    defectId: row.id,
    action: 'created',
    byUser: input.createdBy,
    details: { shortId }
  });
  await db.insert(activity).values({
    projectId: input.projectId,
    userId: input.createdBy,
    type: 'defect',
    message: `Mangel ${shortId} angelegt: ${input.title.slice(0, 60)}`,
    refTable: 'defects',
    refId: row.id
  });
  return row;
}

export async function updateDefectFields(
  projectId: string,
  defectId: string,
  userId: string,
  fields: Partial<{
    title: string;
    description: string | null;
    gewerkId: string | null;
    contactId: string | null;
    apartmentId: string | null;
    deadline: string | null;
    followupDate: string | null;
    priority: number;
    status: 'open' | 'sent' | 'acknowledged' | 'resolved' | 'accepted' | 'rejected' | 'reopened';
  }>
) {
  if (!db) throw new Error('db not initialized');

  const update: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) update[k] = v;
  }
  if (fields.status === 'resolved' || fields.status === 'accepted' || fields.status === 'rejected') {
    update.resolvedAt = new Date();
    update.resolvedBy = userId;
  }

  const [row] = await db
    .update(defects)
    .set(update)
    .where(and(eq(defects.id, defectId), eq(defects.projectId, projectId)))
    .returning();

  if (fields.status) {
    await db.insert(defectHistory).values({
      defectId,
      action: 'status_changed',
      byUser: userId,
      details: { newStatus: fields.status }
    });
  } else {
    await db.insert(defectHistory).values({
      defectId,
      action: 'edited',
      byUser: userId,
      details: fields as Record<string, unknown>
    });
  }
  return row;
}

export async function listPlans(projectId: string) {
  if (!db) return [];
  const rows = await db
    .select()
    .from(plans)
    .where(eq(plans.projectId, projectId))
    .orderBy(desc(plans.createdAt));

  // Defect counts per plan
  const counts = await db
    .select({ planId: defects.planId, c: sql<number>`count(*)::int` })
    .from(defects)
    .where(eq(defects.projectId, projectId))
    .groupBy(defects.planId);
  const byPlan = new Map(counts.map((c) => [c.planId, c.c]));

  return rows.map((p) => ({ ...p, defectCount: byPlan.get(p.id) ?? 0 }));
}

export async function getPlan(projectId: string, planId: string) {
  if (!db) return null;
  const [p] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.projectId, projectId)))
    .limit(1);
  if (!p) return null;
  const planDefects = await db
    .select({
      id: defects.id,
      shortId: defects.shortId,
      title: defects.title,
      status: defects.status,
      page: defects.page,
      xPct: defects.xPct,
      yPct: defects.yPct,
      gewerkColor: gewerke.color
    })
    .from(defects)
    .leftJoin(gewerke, eq(gewerke.id, defects.gewerkId))
    .where(and(eq(defects.projectId, projectId), eq(defects.planId, planId)));
  return { plan: p, defects: planDefects };
}

export async function listContactsForProject(projectId: string) {
  if (!db) return [];
  // Both project-scoped and global (project_id IS NULL)
  return await db
    .select({
      id: contacts.id,
      projectId: contacts.projectId,
      gewerkId: contacts.gewerkId,
      gewerkName: gewerke.name,
      company: contacts.company,
      contactName: contacts.contactName,
      email: contacts.email,
      phone: contacts.phone,
      address: contacts.address
    })
    .from(contacts)
    .leftJoin(gewerke, eq(gewerke.id, contacts.gewerkId))
    .where(sql`(${contacts.projectId} = ${projectId} OR ${contacts.projectId} IS NULL)`)
    .orderBy(asc(gewerke.name));
}
