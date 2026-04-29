import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/client';
import { taskBaselines } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, url, locals }) => {
  if (!locals.user || !db) error(401);
  const label = url.searchParams.get('label');
  if (!label) error(400, 'label query missing');

  const rows = await db
    .select({
      taskId: taskBaselines.taskId,
      plannedStart: taskBaselines.plannedStart,
      plannedEnd: taskBaselines.plannedEnd
    })
    .from(taskBaselines)
    .where(and(eq(taskBaselines.projectId, params.projectId), eq(taskBaselines.snapshotLabel, label)));

  return json(rows);
};
