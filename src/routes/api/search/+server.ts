import { json, error } from '@sveltejs/kit';
import { searchProject } from '$lib/db/searchQueries';
import { userIsProjectMember } from '$lib/db/projectQueries';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) error(401, 'Nicht authentifiziert');

  const projectId = url.searchParams.get('projectId');
  const q = url.searchParams.get('q')?.trim() ?? '';

  if (!projectId) error(400, 'projectId fehlt');
  if (q.length < 2) return json({ hits: [] });

  const member = await userIsProjectMember(locals.user.id, projectId);
  if (!member) error(403, 'Kein Mitglied dieses Projekts');

  const hits = await searchProject(projectId, q, 5);
  return json({ hits });
};
