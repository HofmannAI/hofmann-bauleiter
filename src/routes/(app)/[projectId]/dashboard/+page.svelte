<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { timeAgo } from '$lib/util/time';

  let { data } = $props();
  let parent = $derived(data);

  let houseSummary = $derived(parent.houses
    .map((h) => `${h.name} · ${h.apartments.length} Wohnungen`)
    .join(' · ') || 'Noch keine Häuser');

  let stats = $derived(parent.stats ?? { checklistsDone: 0, defectsOpen: 0, taskCount: 0 });
</script>

<div class="page">
  <section class="hero">
    <div class="hero-eyebrow">Bauleiter-Cockpit</div>
    <h1 class="hero-title">{parent.project.name}</h1>

    <div class="hero-progress-row">
      <div class="progress-ring">
        <svg viewBox="0 0 80 80">
          <circle class="ring-bg" cx="40" cy="40" r="34" />
          <circle class="ring-fg" cx="40" cy="40" r="34" stroke-dasharray="213" stroke-dashoffset="213" />
        </svg>
        <div class="progress-ring-label">0%</div>
      </div>
      <div class="hero-stats">
        <div>
          <div class="hero-stat-num">{stats.checklistsDone}</div>
          <div class="hero-stat-lbl">Erledigt</div>
        </div>
        <div>
          <div class="hero-stat-num">{stats.defectsOpen}</div>
          <div class="hero-stat-lbl">Mängel offen</div>
        </div>
        <div>
          <div class="hero-stat-num">{stats.taskCount}</div>
          <div class="hero-stat-lbl">Termine</div>
        </div>
      </div>
    </div>

    <div class="hero-meta">
      <span class="hero-meta-item">AN: <b>{parent.project.an}</b></span>
      <span class="hero-meta-item">{houseSummary}</span>
    </div>
  </section>

  <h2 class="section-title">Schnellzugriff</h2>
  <div class="quick-grid">
    <a class="quick-card" href={`/${parent.project.id}/checklisten`}>
      <span class="scope-icon"><Icon name="list" size={15} /></span>
      <span>Checklisten</span>
    </a>
    <a class="quick-card" href={`/${parent.project.id}/bauzeitenplan`}>
      <span class="scope-icon"><Icon name="gantt" size={15} /></span>
      <span>Bauzeitenplan</span>
    </a>
    <a class="quick-card" href={`/${parent.project.id}/aufgaben`}>
      <span class="scope-icon"><Icon name="tasks" size={15} /></span>
      <span>Aufgaben</span>
    </a>
    <a class="quick-card" href={`/${parent.project.id}/maengel`}>
      <span class="scope-icon"><Icon name="defect" size={15} /></span>
      <span>Mängel</span>
    </a>
  </div>

  <h2 class="section-title">Letzte Aktivität <span class="count">{parent.recent.length}</span></h2>
  {#if parent.recent.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Noch keine Einträge.</div>
    </div>
  {:else}
    <div class="activity-feed">
      {#each parent.recent as a (a.id)}
        <div class="activity-item">
          <span class="activity-icon" class:photo={a.type === 'photo'} class:defect={a.type === 'defect'}>
            <Icon name={a.type === 'photo' ? 'photo' : a.type === 'defect' ? 'defect' : 'check'} size={15} />
          </span>
          <span class="activity-text">
            <span class="activity-line1">{a.message}</span>
            <span class="activity-line2">{a.userName ?? 'System'} · {timeAgo(a.ts)}</span>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 8px; }
  @media (min-width: 640px) { .quick-grid { grid-template-columns: repeat(4, 1fr); } }
  .quick-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-md); padding: 14px;
    display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
    color: var(--ink); text-decoration: none;
    box-shadow: var(--shadow-1); transition: all .12s;
    font-family: var(--display); font-weight: 700; font-size: 14px;
  }
  .quick-card:hover { border-color: var(--ink); transform: translateY(-1px); box-shadow: var(--shadow-2); }
  :global(.scope-icon) {
    width: 26px; height: 26px; border-radius: 8px;
    background: var(--red-soft); color: var(--red);
    display: flex; align-items: center; justify-content: center;
  }
</style>
