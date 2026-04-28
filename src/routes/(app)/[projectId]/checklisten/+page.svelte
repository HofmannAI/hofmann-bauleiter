<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  let { data } = $props();
  let parent = $derived(data);

  const SCOPE_LABELS = { project: 'Projekt-weit', house: 'Pro Haus', apartment: 'Pro Wohnung' };

  let filter = $state<'alle' | 'project' | 'house' | 'apartment'>('alle');

  let filtered = $derived(
    filter === 'alle'
      ? parent.checklists
      : parent.checklists.filter((c) => c.scope === filter)
  );

  function pct(c: { itemCount: number; doneCount: number }) {
    if (c.itemCount === 0) return 0;
    return Math.round((c.doneCount / c.itemCount) * 100);
  }

  let counts = $derived({
    alle: parent.checklists.length,
    project: parent.checklists.filter((c) => c.scope === 'project').length,
    house: parent.checklists.filter((c) => c.scope === 'house').length,
    apartment: parent.checklists.filter((c) => c.scope === 'apartment').length
  });
</script>

<div class="page">
  <h2 class="section-title">Checklisten <span class="count">{filtered.length}</span></h2>

  <div class="filter-bar">
    <button class="filter-pill" class:active={filter === 'alle'} onclick={() => (filter = 'alle')}>
      Alle <span class="badge">{counts.alle}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'project'} onclick={() => (filter = 'project')}>
      Projekt <span class="badge">{counts.project}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'house'} onclick={() => (filter = 'house')}>
      Häuser <span class="badge">{counts.house}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'apartment'} onclick={() => (filter = 'apartment')}>
      Wohnungen <span class="badge">{counts.apartment}</span>
    </button>
  </div>

  {#if filtered.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Keine Checklisten in diesem Filter.</div>
    </div>
  {:else}
    <div class="checklist-grid">
      {#each filtered as c (c.id)}
        <a class="checklist-card" class:complete={c.itemCount > 0 && c.doneCount === c.itemCount} href={`/${parent.project.id}/checklisten/${c.id}`}>
          <div class="checklist-card-head">
            <span class="checklist-num">{c.num}</span>
            <span>
              <span class="checklist-title">{c.title}</span>
              <div class="checklist-meta">
                <span class="scope-tag {c.scope}">{SCOPE_LABELS[c.scope]}</span>
                {#if c.photoCount > 0}
                  <span class="checklist-photo-count"><Icon name="photo" size={12} /> {c.photoCount}</span>
                {/if}
              </div>
            </span>
          </div>
          <div class="checklist-card-foot">
            <div class="progress-bar">
              <div class="progress-bar-fill" class:green={c.doneCount === c.itemCount && c.itemCount > 0} style={`width:${pct(c)}%`}></div>
            </div>
            <span class="checklist-progress-num">{c.doneCount}/{c.itemCount}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .checklist-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
  @media (min-width: 640px) { .checklist-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 900px) { .checklist-grid { grid-template-columns: repeat(3, 1fr); } }
  .checklist-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-lg); padding: 14px;
    text-align: left; transition: all .15s; box-shadow: var(--shadow-1);
    display: flex; flex-direction: column; width: 100%;
    color: inherit; text-decoration: none;
  }
  .checklist-card:hover { border-color: var(--ink); transform: translateY(-2px); box-shadow: var(--shadow-2); }
  .checklist-card.complete { background: var(--paper-tint); }
  .checklist-card-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 10px; }
  .checklist-num { flex-shrink: 0; width: 30px; height: 30px; background: var(--ink); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 13px; }
  .checklist-card.complete .checklist-num { background: var(--green); }
  .checklist-title { font-family: var(--display); font-weight: 700; font-size: 15px; line-height: 1.2; margin: 4px 0; display: block; }
  .checklist-meta { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
  .scope-tag { padding: 2px 7px; background: var(--grey-soft); border-radius: 4px; color: var(--ink-2); }
  .scope-tag.project { background: var(--blue-soft); color: var(--blue); }
  .scope-tag.house { background: #F0E5DC; color: #6B4A2C; }
  .scope-tag.apartment { background: var(--red-soft); color: var(--red-deep); }
  .checklist-card-foot { display: flex; align-items: center; gap: 10px; margin-top: auto; padding-top: 10px; }
  .checklist-card-foot .progress-bar { flex: 1; }
  .checklist-progress-num { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--ink); }
  .checklist-photo-count { display: inline-flex; align-items: center; gap: 4px; font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; }
</style>
