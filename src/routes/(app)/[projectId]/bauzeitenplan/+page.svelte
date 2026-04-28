<script lang="ts">
  import Gantt from '$lib/components/Gantt.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';

  let { data } = $props();
  let parent = $derived(data);

  let selected = $state<string | null>(null);
  let selectedTask = $derived(parent.tasks.find((t) => t.id === selected) ?? null);
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
    <Gantt tasks={parent.tasks} onSelect={(id) => (selected = id)} />
  {/if}
</div>

{#if selectedTask}
  <button class="scrim open" onclick={() => (selected = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Termin-Detail">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">{selectedTask.num ?? 'Termin'}</div>
        <h3 class="sheet-title">{selectedTask.name}</h3>
      </div>
      <button class="sheet-close" onclick={() => (selected = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <div class="field">
        <span class="field-label">Start</span>
        <div>{selectedTask.startDate}</div>
      </div>
      <div class="field">
        <span class="field-label">Ende</span>
        <div>{selectedTask.endDate}</div>
      </div>
      <div class="field">
        <span class="field-label">Dauer (AT)</span>
        <div>{selectedTask.durationAt ?? '-'}</div>
      </div>
      <div class="field">
        <span class="field-label">Farbe</span>
        <div style={`width:32px;height:32px;border-radius:8px;background:${selectedTask.color ?? '#3B6CC4'}`}></div>
      </div>
      <p class="field-hint">Bearbeiten in Phase 2 (Gantt-Engine, Drag-to-Move, Per-Wohnung).</p>
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
</style>
