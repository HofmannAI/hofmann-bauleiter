import { db } from './client';
import {
  checklists,
  checklistSections,
  checklistItems,
  checklistProgress,
  checklistPhotos,
  houses,
  apartments
} from './schema';
import { eq, asc, and, sql } from 'drizzle-orm';

export type ScopeInstance = {
  key: string;
  label: string;
  short: string;
  houseId: string | null;
  apartmentId: string | null;
};

/**
 * Build the list of scope instances for a project + scope.
 * `project` → 1 instance, `house` → N houses, `apartment` → all apartments.
 */
export async function buildScopeInstances(
  projectId: string,
  scope: 'project' | 'house' | 'apartment'
): Promise<ScopeInstance[]> {
  if (!db) return [];
  if (scope === 'project') {
    return [{ key: 'project', label: 'Projekt', short: 'Projekt', houseId: null, apartmentId: null }];
  }
  const houseRows = await db
    .select()
    .from(houses)
    .where(eq(houses.projectId, projectId))
    .orderBy(asc(houses.sortOrder));

  if (scope === 'house') {
    return houseRows.map((h, i) => ({
      key: `h:${h.id}`,
      label: h.name,
      short: `H${i + 1}`,
      houseId: h.id,
      apartmentId: null
    }));
  }

  // apartment
  const out: ScopeInstance[] = [];
  for (const h of houseRows) {
    const apts = await db
      .select()
      .from(apartments)
      .where(eq(apartments.houseId, h.id))
      .orderBy(asc(apartments.sortOrder));
    apts.forEach((a, ai) => {
      out.push({
        key: `h:${h.id}:a:${a.id}`,
        label: `${h.name} · ${a.name}`,
        short: `${h.name.replace(/\s/g, '')}-${a.name.replace('Wohnung ', 'W')}`,
        houseId: h.id,
        apartmentId: a.id
      });
    });
  }
  return out;
}

export type ChecklistWithMeta = {
  id: string;
  num: number;
  title: string;
  scope: 'project' | 'house' | 'apartment';
  itemCount: number;
  doneCount: number;
  photoCount: number;
};

export async function listChecklistsWithProgress(projectId: string): Promise<ChecklistWithMeta[]> {
  if (!db) return [];
  const cls = await db.select().from(checklists).orderBy(asc(checklists.sortOrder));

  const result: ChecklistWithMeta[] = [];
  for (const cl of cls) {
    // Item count for this checklist
    const [{ c: itemCount }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(checklistItems)
      .innerJoin(checklistSections, eq(checklistSections.id, checklistItems.sectionId))
      .where(eq(checklistSections.checklistId, cl.id));

    // Scope instances
    const inst = await buildScopeInstances(projectId, cl.scope);
    const totalSlots = (itemCount as number) * inst.length;

    // Done count for this checklist (project + done = true + items belonging to this checklist)
    const [{ c: doneCount }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(checklistProgress)
      .innerJoin(checklistItems, eq(checklistItems.id, checklistProgress.itemId))
      .innerJoin(checklistSections, eq(checklistSections.id, checklistItems.sectionId))
      .where(
        and(
          eq(checklistProgress.projectId, projectId),
          eq(checklists.id, cl.id),
          eq(checklistProgress.done, true)
        )
      );

    const [{ c: photoCount }] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(checklistPhotos)
      .innerJoin(checklistProgress, eq(checklistProgress.id, checklistPhotos.progressId))
      .innerJoin(checklistItems, eq(checklistItems.id, checklistProgress.itemId))
      .innerJoin(checklistSections, eq(checklistSections.id, checklistItems.sectionId))
      .where(and(eq(checklistProgress.projectId, projectId), eq(checklists.id, cl.id)));

    result.push({
      id: cl.id,
      num: cl.num,
      title: cl.title,
      scope: cl.scope,
      itemCount: totalSlots,
      doneCount: doneCount as number,
      photoCount: photoCount as number
    });
  }
  return result;
}

/** Detail load: sections + items + progress map keyed by `itemId|scopeKey`. */
export async function loadChecklistDetail(projectId: string, checklistId: string) {
  if (!db) return null;
  const [cl] = await db.select().from(checklists).where(eq(checklists.id, checklistId)).limit(1);
  if (!cl) return null;

  const sections = await db
    .select()
    .from(checklistSections)
    .where(eq(checklistSections.checklistId, cl.id))
    .orderBy(asc(checklistSections.sortOrder));

  const items = await db
    .select({
      id: checklistItems.id,
      sectionId: checklistItems.sectionId,
      text: checklistItems.text,
      sortOrder: checklistItems.sortOrder
    })
    .from(checklistItems)
    .innerJoin(checklistSections, eq(checklistSections.id, checklistItems.sectionId))
    .where(eq(checklistSections.checklistId, cl.id))
    .orderBy(asc(checklistSections.sortOrder), asc(checklistItems.sortOrder));

  const progress = await db
    .select()
    .from(checklistProgress)
    .where(
      and(
        eq(checklistProgress.projectId, projectId),
        sql`item_id IN (SELECT id FROM checklist_items WHERE section_id IN (SELECT id FROM checklist_sections WHERE checklist_id = ${cl.id}))`
      )
    );

  const photos = await db
    .select()
    .from(checklistPhotos)
    .where(sql`progress_id IN (${sql.join(progress.map((p) => sql`${p.id}`), sql`, `)})`);

  const progressMap = new Map<string, { id: string; done: boolean; doneDate: string | null; notes: string | null; photoIds: string[] }>();
  for (const p of progress) {
    progressMap.set(`${p.itemId}|${p.scopeKey}`, {
      id: p.id,
      done: p.done,
      doneDate: p.doneDate,
      notes: p.notes,
      photoIds: photos.filter((ph) => ph.progressId === p.id).map((ph) => ph.id)
    });
  }

  const inst = await buildScopeInstances(projectId, cl.scope);

  return { checklist: cl, sections, items, progressMap, instances: inst };
}

/**
 * Toggle done state (or create progress row) for an item × scope.
 * Returns the resulting row.
 */
export async function setProgress(args: {
  projectId: string;
  itemId: string;
  scopeKey: string;
  done?: boolean;
  doneDate?: string | null;
  notes?: string | null;
  doneBy?: string | null;
}) {
  if (!db) throw new Error('db not initialized');

  const existing = await db
    .select()
    .from(checklistProgress)
    .where(
      and(
        eq(checklistProgress.projectId, args.projectId),
        eq(checklistProgress.itemId, args.itemId),
        eq(checklistProgress.scopeKey, args.scopeKey)
      )
    )
    .limit(1);

  if (existing.length === 0) {
    const [row] = await db
      .insert(checklistProgress)
      .values({
        projectId: args.projectId,
        itemId: args.itemId,
        scopeKey: args.scopeKey,
        done: args.done ?? false,
        doneDate: args.doneDate ?? null,
        notes: args.notes ?? null,
        doneBy: args.done ? args.doneBy ?? null : null
      })
      .returning();
    return row;
  }

  const update: Partial<typeof checklistProgress.$inferInsert> = { updatedAt: new Date() };
  if (args.done !== undefined) {
    update.done = args.done;
    if (args.done) {
      update.doneDate = args.doneDate ?? new Date().toISOString().slice(0, 10);
      update.doneBy = args.doneBy ?? null;
    } else {
      update.doneDate = null;
      update.doneBy = null;
    }
  }
  if (args.doneDate !== undefined) update.doneDate = args.doneDate;
  if (args.notes !== undefined) update.notes = args.notes;

  const [row] = await db
    .update(checklistProgress)
    .set(update)
    .where(eq(checklistProgress.id, existing[0].id))
    .returning();
  return row;
}
