import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db/client';
import { defectPhotos, defects } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params, locals }) => {
  if (!locals.user || !db) error(401);

  // RLS would filter, but be explicit: defect must belong to project
  const [d] = await db
    .select({ id: defects.id })
    .from(defects)
    .where(and(eq(defects.id, params.defectId), eq(defects.projectId, params.projectId)))
    .limit(1);
  if (!d) error(404);

  const rows = await db
    .select({ id: defectPhotos.id, storagePath: defectPhotos.storagePath })
    .from(defectPhotos)
    .where(eq(defectPhotos.defectId, params.defectId));
  return json(rows);
};
