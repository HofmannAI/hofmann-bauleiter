import { db } from './client';
import { tasks, taskDependencies, activity, taskApartmentProgress, gewerke, apartments, houses } from './schema';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';

export async function getProjectTasksAndDeps(projectId: string) {
  if (!db) return { tasks: [], deps: [] };
  const tRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.sortOrder));
  if (tRows.length === 0) return { tasks: tRows, deps: [] };
  const ids = tRows.map((t) => t.id);
  const allDeps = await db.select().from(taskDependencies);
  const idSet = new Set(ids);
  const projDeps = allDeps.filter((d) => idSet.has(d.predecessorId) && idSet.has(d.successorId));
  return { tasks: tRows, deps: projDeps };
}

/** Apply a batch of {id, newStart, newEnd} updates atomically. */
export async function applyTaskUpdates(
  projectId: string,
  updates: { id: string; newStart: string; newEnd: string }[],
  userId: string,
  rootTaskName: string
) {
  if (!db || updates.length === 0) return;
  for (const u of updates) {
    await db
      .update(tasks)
      .set({ startDate: u.newStart, endDate: u.newEnd, updatedAt: new Date() })
      .where(and(eq(tasks.id, u.id), eq(tasks.projectId, projectId)));
  }
  await db.insert(activity).values({
    projectId,
    userId,
    type: 'task_moved',
    message: `${rootTaskName} verschoben — ${updates.length} Termin${updates.length === 1 ? '' : 'e'} betroffen`,
    refTable: 'tasks',
    refId: updates[0].id
  });
}

export async function getTaskWithApartmentProgress(projectId: string, taskId: string) {
  if (!db) return null;
  const [task] = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).limit(1);
  if (!task) return null;

  const [g] = task.gewerkId
    ? await db.select().from(gewerke).where(eq(gewerke.id, task.gewerkId)).limit(1)
    : [null];

  // All apartments in the project
  const houseRows = await db.select().from(houses).where(eq(houses.projectId, projectId)).orderBy(asc(houses.sortOrder));
  const aptRows: { houseName: string; apartment: typeof apartments.$inferSelect }[] = [];
  for (const h of houseRows) {
    const apts = await db.select().from(apartments).where(eq(apartments.houseId, h.id)).orderBy(asc(apartments.sortOrder));
    apts.forEach((a) => aptRows.push({ houseName: h.name, apartment: a }));
  }

  const progress = await db
    .select()
    .from(taskApartmentProgress)
    .where(eq(taskApartmentProgress.taskId, taskId));

  // Predecessors / successors with names
  const allDeps = await db.select().from(taskDependencies);
  const predecessors = allDeps.filter((d) => d.successorId === taskId);
  const successors = allDeps.filter((d) => d.predecessorId === taskId);
  const relatedIds = Array.from(new Set([...predecessors.map((d) => d.predecessorId), ...successors.map((d) => d.successorId)]));
  const relatedTasks = relatedIds.length > 0 ? await db.select().from(tasks).where(inArray(tasks.id, relatedIds)) : [];

  return {
    task,
    gewerk: g,
    apartments: aptRows,
    apartmentProgress: progress,
    predecessors: predecessors.map((d) => ({ ...d, task: relatedTasks.find((t) => t.id === d.predecessorId) })),
    successors: successors.map((d) => ({ ...d, task: relatedTasks.find((t) => t.id === d.successorId) }))
  };
}

export async function setApartmentProgress(args: {
  projectId: string;
  taskId: string;
  apartmentId: string;
  done?: boolean;
  doneDate?: string | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  notes?: string | null;
  doneBy?: string | null;
}) {
  if (!db) throw new Error('db not initialized');

  const existing = await db
    .select()
    .from(taskApartmentProgress)
    .where(and(eq(taskApartmentProgress.taskId, args.taskId), eq(taskApartmentProgress.apartmentId, args.apartmentId)))
    .limit(1);

  if (existing.length === 0) {
    const [row] = await db.insert(taskApartmentProgress).values({
      taskId: args.taskId,
      apartmentId: args.apartmentId,
      done: args.done ?? false,
      doneDate: args.done ? (args.doneDate ?? new Date().toISOString().slice(0, 10)) : null,
      doneBy: args.done ? args.doneBy ?? null : null,
      plannedStart: args.plannedStart ?? null,
      plannedEnd: args.plannedEnd ?? null,
      notes: args.notes ?? null
    }).returning();
    return row;
  }

  const update: Partial<typeof taskApartmentProgress.$inferInsert> = { updatedAt: new Date() };
  if (args.done !== undefined) {
    update.done = args.done;
    update.doneDate = args.done ? (args.doneDate ?? new Date().toISOString().slice(0, 10)) : null;
    update.doneBy = args.done ? args.doneBy ?? null : null;
  }
  if (args.plannedStart !== undefined) update.plannedStart = args.plannedStart;
  if (args.plannedEnd !== undefined) update.plannedEnd = args.plannedEnd;
  if (args.notes !== undefined) update.notes = args.notes;

  const [row] = await db.update(taskApartmentProgress).set(update).where(eq(taskApartmentProgress.id, existing[0].id)).returning();
  return row;
}
