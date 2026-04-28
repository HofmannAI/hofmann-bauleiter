<script lang="ts">
  import Gantt from '$lib/components/Gantt.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import { criticalPath, type EngineTask, type EngineDep } from '$lib/gantt/engine';
  import { toast } from '$lib/components/Toast.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let selected = $state<string | null>(null);
  let selectedTask = $derived(parent.tasks.find((t) => t.id === selected) ?? null);

  let showCritical = $state(false);
  let cpIds = $derived.by(() => {
    if (!showCritical) return new Set<string>();
    const tasks: EngineTask[] = parent.tasks.map((t) => ({
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      durationAt: t.durationAt
    }));
    const deps: EngineDep[] = parent.deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type as 'FS' | 'SS' | 'FF' | 'SF',
      lagDays: d.lagDays
    }));
    return criticalPath(tasks, deps);
  });

  type DiffRow = { id: string; name: string; num: string | null; oldStart: string; oldEnd: string; newStart: string; newEnd: string };
  let pendingMove = $state<null | { taskId: string; newStart: string; newEnd: string; diff: DiffRow[] }>(null);

  async function previewMove(taskId: string, newStart: string, newEnd: string) {
    const fd = new FormData();
    fd.append('taskId', taskId);
    fd.append('newStart', newStart);
    fd.append('newEnd', newEnd);
    const res = await fetch('?/previewMove', { method: 'POST', body: fd });
    if (!res.ok) {
      toast('Vorschau fehlgeschlagen.');
      return;
    }
    const json = (await res.json()) as { type: string; data: string };
    // SvelteKit returns serialized data as a stringified array; parse the form-action shape
    try {
      const data = JSON.parse(json.data) as Array<unknown>;
      // Decode SvelteKit's devalue-like form: index-based pointer array. Easiest: just
      // call parse and find the first object with `diff` key.
      let found: DiffRow[] | null = null;
      for (const x of data) {
        if (x && typeof x === 'object' && 'diff' in (x as object)) {
          // The 'diff' value is an index pointer; we resolve recursively
          // Simpler approach: use a fresh fetch through enhance below
          break;
        }
      }
      // Fallback: just do a server-side propagate locally on the client via a second engine call.
      const tasks: EngineTask[] = parent.tasks.map((t) => ({ id: t.id, startDate: t.startDate, endDate: t.endDate, durationAt: t.durationAt }));
      const deps: EngineDep[] = parent.deps.map((d) => ({ predecessorId: d.predecessorId, successorId: d.successorId, type: d.type as 'FS', lagDays: d.lagDays }));
      const { propagate } = await import('$lib/gantt/engine');
      const local = propagate(tasks, deps, { id: taskId, start: newStart, end: newEnd });
      const rows: DiffRow[] = Array.from(local.entries()).map(([id, d]) => {
        const t = parent.tasks.find((x) => x.id === id);
        return { id, name: t?.name ?? '', num: t?.num ?? null, ...d };
      });
      found = rows;
      pendingMove = { taskId, newStart, newEnd, diff: found };
    } catch (_e) {
      toast('Konnte Vorschau nicht parsen.');
    }
  }

  async function applyMove() {
    if (!pendingMove) return;
    const fd = new FormData();
    fd.append('taskId', pendingMove.taskId);
    fd.append('newStart', pendingMove.newStart);
    fd.append('newEnd', pendingMove.newEnd);
    const res = await fetch('?/applyMove', { method: 'POST', body: fd });
    if (res.ok) {
      toast(`${pendingMove.diff.length} Termin${pendingMove.diff.length === 1 ? '' : 'e'} aktualisiert.`);
      pendingMove = null;
      await invalidateAll();
    } else {
      toast('Übernehmen fehlgeschlagen.');
    }
  }
</script>

<div class="gantt-page">
  {#if parent.tasks.length === 0}
    <div class="gantt-empty">
      <div class="empty-emoji" style="font-size:38px">·</div>
      <div class="empty-text" style="font-size:15px;color:var(--muted)">Noch keine Termine im Bauzeitenplan.</div>
      <div class="gantt-empty-actions">
        <form method="POST" action="?/loadSample" use:enhance>
          <button class="btn btn-primary" type="submit">
            <Icon name="download" size={16} /> Gaisbach 13 laden (150 Termine)
          </button>
        </form>
      </div>
    </div>
  {:else}
    <div class="gantt-extras">
      <button class="filter-pill" class:active={showCritical} onclick={() => (showCritical = !showCritical)}>
        Kritischer Pfad {#if showCritical}<span class="badge">{cpIds.size}</span>{/if}
      </button>
    </div>
    <Gantt
      tasks={parent.tasks}
      criticalPathIds={cpIds}
      onSelect={(id) => (selected = id)}
      onMove={previewMove}
    />
  {/if}
</div>

{#if pendingMove}
  <button class="scrim open" onclick={() => (pendingMove = null)} aria-label="Schließen"></button>
  <div class="dialog open" role="dialog" aria-label="Verschiebung bestätigen" style="display:flex">
    <div class="dialog-panel">
      <h3 class="dialog-title">Termine verschieben</h3>
      <p class="dialog-text">
        Diese Verschiebung verschiebt <b>{pendingMove.diff.length}</b> Termine.
        Übernehmen?
      </p>
      <div class="diff-list">
        {#each pendingMove.diff as d (d.id)}
          <div class="diff-row">
            <span class="diff-num">{d.num ?? ''}</span>
            <span class="diff-name">{d.name}</span>
            <span class="diff-dates">{d.oldStart} → <b>{d.newStart}</b></span>
          </div>
        {/each}
      </div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" onclick={() => (pendingMove = null)}>Abbrechen</button>
        <button class="btn btn-primary" onclick={applyMove}>Übernehmen</button>
      </div>
    </div>
  </div>
{/if}

{#if selectedTask}
  <button class="scrim open" onclick={() => (selected = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Termin bearbeiten">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">{selectedTask.num ?? 'Termin'}</div>
        <h3 class="sheet-title">{selectedTask.name}</h3>
      </div>
      <button class="sheet-close" onclick={() => (selected = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <a class="btn btn-ghost btn-block" style="margin-bottom:14px" href={`/${parent.project.id}/bauzeitenplan/${selectedTask.id}`}>
        <Icon name="edit" /> Termin bearbeiten
      </a>
      <div class="field-row">
        <div class="field">
          <span class="field-label">Start</span>
          <div>{selectedTask.startDate}</div>
        </div>
        <div class="field">
          <span class="field-label">Ende</span>
          <div>{selectedTask.endDate}</div>
        </div>
      </div>
      <div class="field">
        <span class="field-label">Dauer (AT)</span>
        <div>{selectedTask.durationAt ?? '-'}</div>
      </div>
      <div class="field">
        <span class="field-label">Farbe</span>
        <div style={`width:32px;height:32px;border-radius:8px;background:${selectedTask.color ?? '#3B6CC4'}`}></div>
      </div>
      {#if selectedTask.notes}
        <div class="field">
          <span class="field-label">Notizen</span>
          <div>{selectedTask.notes}</div>
        </div>
      {/if}
    </div>
    <div class="sheet-foot">
      <button class="btn btn-ghost btn-block" onclick={() => (selected = null)}>Schließen</button>
    </div>
  </div>
{/if}

<style>
  .gantt-page { padding: 0; max-width: none; margin: 0; }
  .gantt-empty { padding: 60px 20px; text-align: center; }
  .gantt-empty-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
  .gantt-extras { padding: 10px 14px; background: var(--paper-tint); border-bottom: 1px solid var(--line); display: flex; gap: 6px; }

  .diff-list { max-height: 280px; overflow-y: auto; margin-bottom: 14px; border: 1px solid var(--line); border-radius: var(--r-md); }
  .diff-row { display: flex; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--line); align-items: center; font-size: 13px; }
  .diff-row:last-child { border-bottom: none; }
  .diff-num { font-family: var(--mono); font-size: 11px; color: var(--muted); flex-shrink: 0; min-width: 38px; }
  .diff-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .diff-dates { font-family: var(--mono); font-size: 11px; color: var(--ink-2); flex-shrink: 0; }
</style>
