/**
 * Subscribe to Postgres changes for the current project. Triggers
 * `invalidateAll` so SvelteKit re-runs server loads. Toast surfaces who did what.
 *
 * Usage (in a +layout.svelte for [projectId]):
 *   onMount(() => subscribeRealtime(projectId))
 */
import { invalidateAll } from '$app/navigation';
import { getSupabaseBrowser } from '$lib/auth/supabase-browser';
import { toast } from '$lib/components/Toast.svelte';

export function subscribeRealtime(projectId: string): () => void {
  const sb = getSupabaseBrowser();

  const channel = sb
    .channel(`project:${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'checklist_progress', filter: `project_id=eq.${projectId}` },
      () => {
        invalidateAll();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'defects', filter: `project_id=eq.${projectId}` },
      (payload) => {
        invalidateAll();
        if (payload.eventType === 'INSERT') toast('Neuer Mangel angelegt');
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
      () => invalidateAll()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity', filter: `project_id=eq.${projectId}` },
      (payload) => {
        invalidateAll();
        const msg = (payload.new as { message?: string } | null)?.message;
        if (msg) toast(msg.length > 60 ? msg.slice(0, 57) + '…' : msg);
      }
    )
    .subscribe();

  return () => {
    sb.removeChannel(channel);
  };
}
