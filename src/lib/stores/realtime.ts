/**
 * Subscribe to Postgres changes for the current project. Triggers
 * `invalidateAll` so SvelteKit re-runs server loads. Toast surfaces who did what.
 *
 * Debounced: multiple rapid changes (e.g. create + template apply + activity)
 * are batched into a single invalidateAll() call with 800ms delay.
 * This prevents connection pool exhaustion from 8+ parallel queries.
 *
 * Usage (in a +layout.svelte for [projectId]):
 *   onMount(() => subscribeRealtime(projectId))
 */
import { invalidateAll } from '$app/navigation';
import { getSupabaseBrowser } from '$lib/auth/supabase-browser';
import { toast } from '$lib/components/Toast.svelte';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let suppressUntil = 0;

/** Call this before performing a local action (create, update) to suppress
 *  the realtime echo for 2 seconds. Prevents double-invalidation. */
export function suppressRealtimeFor(ms = 2000) {
  suppressUntil = Date.now() + ms;
}

function debouncedInvalidate() {
  if (Date.now() < suppressUntil) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    invalidateAll();
  }, 800);
}

export function subscribeRealtime(projectId: string): () => void {
  const sb = getSupabaseBrowser();

  const channel = sb
    .channel(`project:${projectId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'checklist_progress', filter: `project_id=eq.${projectId}` },
      () => debouncedInvalidate()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'defects', filter: `project_id=eq.${projectId}` },
      (payload) => {
        debouncedInvalidate();
        if (payload.eventType === 'INSERT' && Date.now() >= suppressUntil) {
          toast('Neuer Mangel angelegt');
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
      () => debouncedInvalidate()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity', filter: `project_id=eq.${projectId}` },
      (payload) => {
        debouncedInvalidate();
        if (Date.now() >= suppressUntil) {
          const msg = (payload.new as { message?: string } | null)?.message;
          if (msg) toast(msg.length > 60 ? msg.slice(0, 57) + '…' : msg);
        }
      }
    )
    .subscribe();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    sb.removeChannel(channel);
  };
}
