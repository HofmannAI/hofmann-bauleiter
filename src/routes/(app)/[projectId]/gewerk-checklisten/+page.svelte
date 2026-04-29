<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let gewerkFilter = $state<string>(parent.gewerke[0]?.id ?? '');
  let apartmentFilter = $state<string>('all');

  let templates = $derived(parent.templates.filter((t) => t.gewerkId === gewerkFilter));
  let apartmentsToShow = $derived(
    apartmentFilter === 'all' ? parent.apartments : parent.apartments.filter((a) => a.id === apartmentFilter)
  );

  function key(gewerkId: string, apartmentId: string, templateId: string): string {
    return `${gewerkId}|${apartmentId}|${templateId}`;
  }

  function isDone(gewerkId: string, apartmentId: string, templateId: string): boolean {
    return parent.progress[key(gewerkId, apartmentId, templateId)]?.done ?? false;
  }

  async function toggle(gewerkId: string, apartmentId: string, templateId: string) {
    const next = !isDone(gewerkId, apartmentId, templateId);
    const fd = new FormData();
    fd.append('gewerkId', gewerkId);
    fd.append('apartmentId', apartmentId);
    fd.append('templateId', templateId);
    fd.append('done', String(next));
    const res = await fetch('?/set', { method: 'POST', body: fd });
    if (res.ok) {
      toast(next ? 'Erledigt.' : 'Zurückgesetzt.');
      await invalidateAll();
    }
  }

  function aptProgress(gewerkId: string, apartmentId: string): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const t of parent.templates.filter((x) => x.gewerkId === gewerkId)) {
      total++;
      if (isDone(gewerkId, apartmentId, t.id)) done++;
    }
    return { done, total };
  }
</script>

<div class="page">
  <h2 class="section-title">Checklisten je Gewerk je Wohnung</h2>

  <div class="filter-bar">
    {#each parent.gewerke.filter((g) => parent.templates.some((t) => t.gewerkId === g.id)) as g}
      <button class="filter-pill" class:active={gewerkFilter === g.id} onclick={() => (gewerkFilter = g.id)}>
        {g.name}
      </button>
    {/each}
  </div>

  <div class="filter-bar">
    <button class="filter-pill" class:active={apartmentFilter === 'all'} onclick={() => (apartmentFilter = 'all')}>Alle Wohnungen</button>
    {#each parent.apartments as a}
      {@const p = aptProgress(gewerkFilter, a.id)}
      <button class="filter-pill" class:active={apartmentFilter === a.id} onclick={() => (apartmentFilter = a.id)}>
        {a.houseName} {a.name}
        <span class="badge">{p.done}/{p.total}</span>
      </button>
    {/each}
  </div>

  {#if templates.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Keine Vorlagen für dieses Gewerk.</div>
    </div>
  {:else}
    {#each apartmentsToShow as a (a.id)}
      <div class="apt-block">
        <h3 class="apt-block-title">{a.houseName} · {a.name}</h3>
        <div class="checks">
          {#each templates as t (t.id)}
            <button class="check-row" class:done={isDone(gewerkFilter, a.id, t.id)} onclick={() => toggle(gewerkFilter, a.id, t.id)}>
              <span class="check-box-i">
                {#if isDone(gewerkFilter, a.id, t.id)}<Icon name="check" size={12} />{/if}
              </span>
              <span class="check-text">{t.item}</span>
              {#if t.requiresPhoto}<span class="check-cam"><Icon name="photo" size={11} /></span>{/if}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .apt-block { margin-bottom: 18px; }
  .apt-block-title { font-family: var(--display); font-weight: 700; font-size: 15px; margin: 0 0 8px; padding: 0 4px; }
  .checks { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; }
  .check-row { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-bottom: 1px solid var(--line); width: 100%; text-align: left; cursor: pointer; font-family: inherit; }
  .check-row:last-child { border-bottom: none; }
  .check-row:hover { background: var(--paper-tint); }
  .check-row.done { background: var(--green-soft); }
  .check-box-i { width: 22px; height: 22px; border: 2px solid var(--line-strong); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--paper); color: #fff; }
  .check-row.done .check-box-i { background: var(--green); border-color: var(--green); }
  .check-text { flex: 1; font-size: 14px; }
  .check-cam { color: var(--muted); }
  .check-row.done .check-cam { color: var(--green); }
</style>
