import type { PageServerLoad } from './$types';
import { listChecklistsWithProgress } from '$lib/db/checklistQueries';

export const load: PageServerLoad = async ({ params }) => {
  const checklists = await listChecklistsWithProgress(params.projectId);
  return { checklists };
};
