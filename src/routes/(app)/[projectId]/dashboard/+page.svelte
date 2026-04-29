<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { timeAgo } from '$lib/util/time';
  import { onMount } from 'svelte';

  let { data } = $props();
  let parent = $derived(data);

  let houseSummary = $derived(parent.houses
    .map((h) => `${h.name} · ${h.apartments.length} Wohnungen`)
    .join(' · ') || 'Noch keine Häuser');

  let stats = $derived(parent.stats ?? { checklistsDone: 0, defectsOpen: 0, taskCount: 0 });

  // Project progress: rough heuristic — done checklist items / (done + open defects + open tasks)
  let percentTarget = $derived(() => {
    const total = stats.checklistsDone + stats.defectsOpen + stats.taskCount;
    if (total === 0) return 0;
    return Math.min(100, Math.round((stats.checklistsDone / total) * 100));
  });

  let displayPercent = $state(0);
  onMount(() => {
    // Counter animation on mount
    const target = percentTarget();
    const start = performance.now();
    const dur = 900;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // cubic-out
      displayPercent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });

  // Stroke-dashoffset: circumference 2πr where r=34
  const C = 2 * Math.PI * 34; // 213.628
  let dashOffset = $derived(C - (displayPercent / 100) * C);

  // Avatar colors per profile id (deterministic hash)
  function avatarColor(id: string | null | undefined): string {
    if (!id) return 'var(--grey)';
    let h = 0;
    for (const c of id) h = (h << 5) - h + c.charCodeAt(0);
    const palette = ['#E8833A', '#3B6CC4', '#3FAA60', '#D4A22A', '#7A7570', '#C9482F', '#1E96A8', '#7CB246', '#9F4EAB'];
    return palette[Math.abs(h) % palette.length];
  }
  function initials(name: string | null | undefined): string {
    if (!name) return '·';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
</script>

<div class="page">
  <section class="hero">
    <div class="hero-eyebrow">Bauleiter-Cockpit</div>
    <h1 class="hero-title">{parent.project.name}</h1>

    <div class="hero-progress-row">
      <div class="progress-ring">
        <svg viewBox="0 0 80 80">
          <circle class="ring-bg" cx="40" cy="40" r="34" />
          <circle class="ring-fg" cx="40" cy="40" r="34" stroke-dasharray={C} stroke-dashoffset={dashOffset} />
        </svg>
        <div class="progress-ring-label">{displayPercent}%</div>
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
    <a class="quick-card" href={`/${parent.project.id}/kontakte`}>
      <span class="scope-icon"><Icon name="phone" size={15} /></span>
      <span>Kontakte</span>
    </a>
    <a class="quick-card" href={`/${parent.project.id}/gewerk-checklisten`}>
      <span class="scope-icon"><Icon name="apartment" size={15} /></span>
      <span>Gewerk-Checks</span>
    </a>
    <a class="quick-card" href={`/${parent.project.id}/musterdetails`}>
      <span class="scope-icon"><Icon name="file" size={15} /></span>
      <span>Musterdetails</span>
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
          <span class="avatar" style:background={avatarColor(a.userName)}>
            {initials(a.userName)}
          </span>
          <span class="activity-text">
            <span class="activity-line1">
              <b>{a.userName ?? 'System'}</b> {a.message}
            </span>
            <span class="activity-line2">
              <Icon name={a.type === 'photo' ? 'photo' : a.type === 'defect' ? 'defect' : a.type === 'task_moved' ? 'gantt' : 'check'} size={11} />
              {timeAgo(a.ts)}
            </span>
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
  .avatar {
    width: 30px; height: 30px; border-radius: 50%;
    color: #fff; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display); font-weight: 700; font-size: 11px;
    letter-spacing: 0.02em;
  }
  .activity-line1 :global(b) { font-weight: 700; color: var(--ink); }
  .activity-line2 { display: inline-flex; align-items: center; gap: 5px; }
  .activity-line2 :global(svg) { color: var(--muted); }
</style>
