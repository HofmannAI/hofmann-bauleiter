import type { PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, gewerke, taskApartmentProgress, apartments, houses, defects } from '$lib/db/schema';
import { eq, and, sql, asc, isNull, isNotNull } from 'drizzle-orm';

export type AufgabeRow = {
  kind: 'task' | 'task_apartment' | 'defect';
  id: string;
  num: string | null;
  title: string;
  scopeLabel: string | null;
  gewerkColor: string | null;
  gewerkName: string | null;
  deadline: string | null;
  daysFromToday: number;
  priority: number | null;
  href: string;
};

function daysFromToday(dateStr: string | null | undefined): number {
  if (!dateStr) return Number.MAX_SAFE_INTEGER;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { items: [] as AufgabeRow[] };
  const projectId = params.projectId;

  // Tasks (parent_id IS NULL → leaf check via subquery; for v1 list all leaf tasks not done)
  const tRows = await db
    .select({
      id: tasks.id,
      num: tasks.num,
      name: tasks.name,
      gewerkId: tasks.gewerkId,
      gewerkName: gewerke.name,
      gewerkColor: gewerke.color,
      perApartment: tasks.perApartment,
      defaultPerApartment: gewerke.defaultPerApartment,
      endDate: tasks.endDate
    })
    .from(tasks)
    .leftJoin(gewerke, eq(gewerke.id, tasks.gewerkId))
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.parentId)))
    .orderBy(asc(tasks.endDate));

  // Detect parents (any task that's a parent has children)
  const allTasks = await db.select({ id: tasks.id, parentId: tasks.parentId }).from(tasks).where(eq(tasks.projectId, projectId));
  const isParent = new Set(allTasks.filter((t) => t.parentId).map((t) => t.parentId!));

  const leafTasks = await db
    .select({
      id: tasks.id,
      num: tasks.num,
      name: tasks.name,
      gewerkName: gewerke.name,
      gewerkColor: gewerke.color,
      perApartment: tasks.perApartment,
      defaultPerApartment: gewerke.defaultPerApartment,
      endDate: tasks.endDate
    })
    .from(tasks)
    .leftJoin(gewerke, eq(gewerke.id, tasks.gewerkId))
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.endDate));

  const taskItems: AufgabeRow[] = [];
  for (const t of leafTasks) {
    if (isParent.has(t.id)) continue; // skip summary rows

    const isPer = (t.defaultPerApartment ?? false) || (t.perApartment ?? false);
    if (isPer) {
      // Per-apartment: emit one row per apartment that's not done
      const aptRows = await db
        .select({
          aptId: apartments.id,
          aptName: apartments.name,
          houseName: houses.name,
          done: taskApartmentProgress.done,
          plannedEnd: taskApartmentProgress.plannedEnd
        })
        .from(apartments)
        .innerJoin(houses, eq(houses.id, apartments.houseId))
        .leftJoin(taskApartmentProgress, and(eq(taskApartmentProgress.apartmentId, apartments.id), eq(taskApartmentProgress.taskId, t.id)))
        .where(eq(houses.projectId, projectId));

      for (const a of aptRows) {
        if (a.done) continue;
        const deadline = a.plannedEnd ?? t.endDate;
        taskItems.push({
          kind: 'task_apartment',
          id: `${t.id}|${a.aptId}`,
          num: t.num,
          title: `${t.name}`,
          scopeLabel: `${a.houseName} · ${a.aptName}`,
          gewerkColor: t.gewerkColor,
          gewerkName: t.gewerkName,
          deadline,
          daysFromToday: daysFromToday(deadline),
          priority: 2,
          href: `/${projectId}/bauzeitenplan/${t.id}`
        });
      }
    } else {
      taskItems.push({
        kind: 'task',
        id: t.id,
        num: t.num,
        title: t.name,
        scopeLabel: null,
        gewerkColor: t.gewerkColor,
        gewerkName: t.gewerkName,
        deadline: t.endDate,
        daysFromToday: daysFromToday(t.endDate),
        priority: 2,
        href: `/${projectId}/bauzeitenplan/${t.id}`
      });
    }
  }

  // Open defects with deadline
  const dRows = await db
    .select({
      id: defects.id,
      shortId: defects.shortId,
      title: defects.title,
      deadline: defects.deadline,
      priority: defects.priority,
      status: defects.status,
      gewerkName: gewerke.name,
      gewerkColor: gewerke.color
    })
    .from(defects)
    .leftJoin(gewerke, eq(gewerke.id, defects.gewerkId))
    .where(and(eq(defects.projectId, projectId), sql`status NOT IN ('resolved','accepted','rejected')`, isNotNull(defects.deadline)));

  const defectItems: AufgabeRow[] = dRows.map((d) => ({
    kind: 'defect',
    id: d.id,
    num: d.shortId ?? null,
    title: d.title,
    scopeLabel: 'Mangel',
    gewerkColor: d.gewerkColor,
    gewerkName: d.gewerkName,
    deadline: d.deadline,
    daysFromToday: daysFromToday(d.deadline),
    priority: d.priority,
    href: `/${projectId}/maengel/${d.id}`
  }));

  const items = [...taskItems, ...defectItems].sort((a, b) => a.daysFromToday - b.daysFromToday);
  return { items };
};
