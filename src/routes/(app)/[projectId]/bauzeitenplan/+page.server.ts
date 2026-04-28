import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/db/client';
import { tasks, taskDependencies } from '$lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { loadGaisbachSample } from '$lib/db/projectQueries';

export const load: PageServerLoad = async ({ params }) => {
  if (!db) return { tasks: [], deps: [] };
  const tRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, params.projectId))
    .orderBy(asc(tasks.sortOrder));

  if (tRows.length === 0) return { tasks: [], deps: [] };

  const tIds = tRows.map((t) => t.id);
  // simple two-step: deps where pred or succ is in our set
  const deps = await db
    .select()
    .from(taskDependencies)
    .where(eq(taskDependencies.predecessorId, tRows[0].id)); // placeholder

  // Better: load all and filter — for project with all-tasks-in-set this is fine
  const allDeps = await db.select().from(taskDependencies);
  const idSet = new Set(tIds);
  const projDeps = allDeps.filter((d) => idSet.has(d.predecessorId) && idSet.has(d.successorId));

  return { tasks: tRows, deps: projDeps };
};

export const actions: Actions = {
  loadSample: async ({ params, locals }) => {
    if (!locals.user || !db) return fail(401);
    await loadGaisbachSample(params.projectId);
    redirect(303, `/${params.projectId}/bauzeitenplan`);
  }
};
