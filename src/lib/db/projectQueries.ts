/**
 * Higher-level queries that span multiple tables. Pure server-side.
 */
import { db } from './client';
import {
  projects,
  projectMembers,
  houses,
  apartments,
  tasks,
  taskDependencies,
  gewerke
} from './schema';
import { sql, eq, and } from 'drizzle-orm';
import { SAMPLE_GAISBACH, type GaisbachTask } from '$lib/seed/gaisbach';

export async function userIsProjectMember(userId: string, projectId: string): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .select({ pid: projectMembers.projectId })
    .from(projectMembers)
    .where(and(eq(projectMembers.userId, userId), eq(projectMembers.projectId, projectId)))
    .limit(1);
  return rows.length > 0;
}

export type CreateProjectInput = {
  name: string;
  an: string;
  ownerId: string;
  houses: { name: string; apartments: { name: string; sizeQm?: number | null | undefined }[] }[];
  template: 'empty' | 'sample';
};

export async function createProject(input: CreateProjectInput) {
  if (!db) throw new Error('db not initialized');

  const [proj] = await db
    .insert(projects)
    .values({ name: input.name, an: input.an || 'Hofmann Haus', createdBy: input.ownerId })
    .returning({ id: projects.id });

  await db.insert(projectMembers).values({ projectId: proj.id, userId: input.ownerId, role: 'owner' });

  const sourceHouses: CreateProjectInput['houses'] =
    input.template === 'sample'
      ? [
          { name: 'Haus A', apartments: Array.from({ length: 8 }, (_, i) => ({ name: `Wohnung ${i + 1}` })) },
          { name: 'Haus B', apartments: Array.from({ length: 8 }, (_, i) => ({ name: `Wohnung ${i + 1}` })) }
        ]
      : input.houses;

  for (let hi = 0; hi < sourceHouses.length; hi++) {
    const h = sourceHouses[hi];
    const [house] = await db
      .insert(houses)
      .values({ projectId: proj.id, name: h.name, sortOrder: hi })
      .returning({ id: houses.id });

    for (let ai = 0; ai < h.apartments.length; ai++) {
      const a = h.apartments[ai];
      await db.insert(apartments).values({
        houseId: house.id,
        name: a.name,
        sortOrder: ai,
        sizeQm: a.sizeQm != null ? a.sizeQm.toString() : null
      });
    }
  }

  if (input.template === 'sample') {
    await loadGaisbachSample(proj.id);
  }

  return proj.id;
}

export async function loadGaisbachSample(projectId: string) {
  if (!db) throw new Error('db not initialized');

  const allGewerke = await db.select().from(gewerke);
  const gewerkByColor = new Map(allGewerke.map((g) => [g.color, g.id]));

  // Insert tasks. Use a temp map: prototype task id -> db uuid.
  const idMap = new Map<string, string>();
  for (const t of SAMPLE_GAISBACH.tasks as GaisbachTask[]) {
    const [row] = await db
      .insert(tasks)
      .values({
        projectId,
        num: t.num,
        name: t.name,
        gewerkId: gewerkByColor.get(t.color) ?? null,
        parentId: null, // updated in second pass
        startDate: t.start,
        endDate: t.end,
        durationAt: t.duration,
        color: t.color,
        depth: t.depth,
        sortOrder: idMap.size,
        notes: null
      })
      .returning({ id: tasks.id });
    idMap.set(t.id, row.id);
  }

  // Resolve parents
  for (const t of SAMPLE_GAISBACH.tasks as GaisbachTask[]) {
    if (!t.parent) continue;
    const childId = idMap.get(t.id);
    const parentId = idMap.get(t.parent);
    if (childId && parentId) {
      await db.execute(sql`UPDATE tasks SET parent_id = ${parentId} WHERE id = ${childId}`);
    }
  }

  // Predecessors → task_dependencies
  for (const t of SAMPLE_GAISBACH.tasks as GaisbachTask[]) {
    for (const predId of t.predecessors ?? []) {
      const succ = idMap.get(t.id);
      const pred = idMap.get(predId);
      if (succ && pred) {
        await db.insert(taskDependencies).values({ predecessorId: pred, successorId: succ });
      }
    }
  }
}
