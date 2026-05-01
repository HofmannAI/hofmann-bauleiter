<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';

  let { data } = $props();
  let parent = $derived(data);

  type Range = '7' | '30' | '90' | 'all';
  let range = $state<Range>('30');

  let cutoff = $derived.by(() => {
    if (range === 'all') return null;
    const days = Number(range);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  });

  let inRange = $derived(
    parent.rows.filter((r) => {
      if (!cutoff) return true;
      return new Date(r.createdAt) >= cutoff;
    })
  );

  let kpis = $derived.by(() => {
    const total = inRange.length;
    const open = inRange.filter((r) => ['open', 'reopened', 'sent', 'acknowledged'].includes(r.status)).length;
    const today = new Date().toISOString().slice(0, 10);
    const overdue = inRange.filter((r) => r.deadline && r.deadline < today && !['resolved', 'accepted', 'rejected'].includes(r.status)).length;
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    const closedThisWeek = inRange.filter((r) => r.resolvedAt && new Date(r.resolvedAt) >= weekStart).length;

    const closedAll = inRange.filter((r) => r.resolvedAt);
    let avgDays: number | null = null;
    if (closedAll.length > 0) {
      let sum = 0;
      for (const r of closedAll) {
        const created = new Date(r.createdAt).getTime();
        const resolved = new Date(r.resolvedAt!).getTime();
        sum += (resolved - created) / (1000 * 60 * 60 * 24);
      }
      avgDays = Math.round(sum / closedAll.length);
    }
    return { total, open, overdue, closedThisWeek, avgDays };
  });

  // Per Gewerk (top 10)
  let perGewerk = $derived.by(() => {
    const counts = new Map<string | null, number>();
    for (const r of inRange) counts.set(r.gewerkId, (counts.get(r.gewerkId) ?? 0) + 1);
    const entries = Array.from(counts.entries())
      .map(([id, n]) => {
        const g = parent.gewerkRows.find((x) => x.id === id);
        return { id, name: g?.name ?? '— ohne Gewerk —', color: g?.color ?? '#9CA3AF', n };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 10);
    const max = entries[0]?.n ?? 1;
    return { entries, max };
  });

  let perStatus = $derived.by(() => {
    const groups: Record<string, number> = { open: 0, sent: 0, acknowledged: 0, resolved: 0, accepted: 0, rejected: 0, reopened: 0 };
    for (const r of inRange) groups[r.status] = (groups[r.status] ?? 0) + 1;
    const entries = Object.entries(groups).filter(([, n]) => n > 0);
    return entries.map(([status, n]) => ({ status, n }));
  });

  // Per Nachunternehmer (top 10)
  let perContact = $derived.by(() => {
    const counts = new Map<string | null, number>();
    for (const r of inRange) counts.set(r.contactId, (counts.get(r.contactId) ?? 0) + 1);
    const entries = Array.from(counts.entries())
      .filter(([id]) => id !== null)
      .map(([id, n]) => {
        const c = parent.contactRows.find((x) => x.id === id);
        return { id, name: c?.company ?? '?', n };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 10);
    const max = entries[0]?.n ?? 1;
    return { entries, max };
  });

  // Time series (per Tag, letzte 30 Tage)
  let timeSeries = $derived.by(() => {
    const days = 30;
    const out: { date: string; n: number }[] = [];
    const map = new Map<string, number>();
    for (const r of inRange) {
      const d = new Date(r.createdAt).toISOString().slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + 1);
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      out.push({ date: iso, n: map.get(iso) ?? 0 });
    }
    const max = Math.max(1, ...out.map((p) => p.n));
    return { out, max };
  });

  const STATUS_LABEL: Record<string, string> = {
    open: 'Offen', sent: 'Gesendet', acknowledged: 'Bestätigt',
    resolved: 'Erledigt', accepted: 'Akzeptiert', rejected: 'Abgelehnt', reopened: 'Wiedereröffnet'
  };
  const STATUS_COLOR: Record<string, string> = {
    open: '#E30613', sent: '#D97706', acknowledged: '#3B6CC4',
    resolved: '#2E7D32', accepted: '#2E7D32', rejected: '#9CA3AF', reopened: '#7C2D12'
  };
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project?.id ?? ''}/maengel`}>
    <Icon name="back" size={12} /> Zurück zur Liste
  </a>

  <div class="stats-header">
    <h2 class="section-title" style="margin:0">Statistik</h2>
    <div class="filter-bar">
      {#each (['7', '30', '90', 'all'] as Range[]) as r}
        <button class="filter-pill" class:active={range === r} onclick={() => (range = r)} type="button">
          {r === 'all' ? 'Gesamt' : `Letzte ${r} Tage`}
        </button>
      {/each}
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><span class="kpi-label">Gesamt</span><span class="kpi-value">{kpis.total}</span></div>
    <div class="kpi"><span class="kpi-label">Offen</span><span class="kpi-value tint-amber">{kpis.open}</span></div>
    <div class="kpi"><span class="kpi-label">Überfällig</span><span class="kpi-value tint-red">{kpis.overdue}</span></div>
    <div class="kpi"><span class="kpi-label">Diese Woche behoben</span><span class="kpi-value tint-green">{kpis.closedThisWeek}</span></div>
    <div class="kpi"><span class="kpi-label">Ø Bearbeitungszeit</span><span class="kpi-value">{kpis.avgDays ?? '—'}<span class="kpi-unit">{kpis.avgDays !== null ? ' Tage' : ''}</span></span></div>
  </div>

  <div class="charts-grid">
    <div class="chart-card">
      <h3 class="chart-title">Mängel pro Gewerk</h3>
      {#if perGewerk.entries.length === 0}
        <p class="chart-empty">Keine Daten im Zeitraum.</p>
      {:else}
        <div class="bar-list">
          {#each perGewerk.entries as e (e.id)}
            <div class="bar-row">
              <span class="bar-label">{e.name}</span>
              <span class="bar-track">
                <span class="bar-fill" style={`width:${(e.n / perGewerk.max) * 100}%;background:${e.color}`}></span>
              </span>
              <span class="bar-count">{e.n}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="chart-card">
      <h3 class="chart-title">Status-Verteilung</h3>
      {#if perStatus.length === 0}
        <p class="chart-empty">Keine Daten im Zeitraum.</p>
      {:else}
        <div class="status-bars">
          {#each perStatus as s (s.status)}
            <div class="status-bar">
              <span class="status-color" style={`background:${STATUS_COLOR[s.status]}`}></span>
              <span class="status-label">{STATUS_LABEL[s.status] ?? s.status}</span>
              <span class="status-count">{s.n}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="chart-card chart-card-wide">
      <h3 class="chart-title">Mängel-Erfassung (letzte 30 Tage)</h3>
      <svg class="line-chart" viewBox="0 0 900 200" preserveAspectRatio="none" role="img" aria-label="Tageschart Mängel-Erfassung">
        {#each timeSeries.out as p, i (p.date)}
          {@const x = (i / (timeSeries.out.length - 1)) * 880 + 10}
          {@const h = (p.n / timeSeries.max) * 170}
          <rect x={x - 12} y={190 - h} width="24" height={h} fill="var(--blue, #3B6CC4)" rx="2" opacity="0.85" />
        {/each}
        <line x1="0" y1="190" x2="900" y2="190" stroke="var(--line)" stroke-width="0.5" />
      </svg>
      <div class="line-axis">
        <span>{timeSeries.out[0]?.date.slice(5).replace('-', '.')}</span>
        <span>heute</span>
      </div>
    </div>

    <div class="chart-card chart-card-wide">
      <h3 class="chart-title">Mängel pro Nachunternehmer (Top 10)</h3>
      {#if perContact.entries.length === 0}
        <p class="chart-empty">Kein Mangel hat einen Nachunternehmer zugeordnet.</p>
      {:else}
        <div class="bar-list">
          {#each perContact.entries as e (e.id)}
            <div class="bar-row">
              <span class="bar-label">{e.name}</span>
              <span class="bar-track">
                <span class="bar-fill" style={`width:${(e.n / perContact.max) * 100}%;background:var(--amber, #D97706)`}></span>
              </span>
              <span class="bar-count">{e.n}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .stats-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .filter-bar { display: flex; gap: 6px; flex-wrap: wrap; }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-bottom: 12px; text-decoration: none; }
  .back-link:hover { color: var(--ink); }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 18px; }
  @media (min-width: 700px) { .kpi-grid { grid-template-columns: repeat(5, 1fr); } }
  .kpi { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 14px; display: flex; flex-direction: column; gap: 6px; }
  .kpi-label { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .kpi-value { font-family: var(--display); font-weight: 800; font-size: 28px; line-height: 1; color: var(--ink); }
  .kpi-value.tint-red { color: var(--red); }
  .kpi-value.tint-amber { color: var(--amber); }
  .kpi-value.tint-green { color: var(--green); }
  .kpi-unit { font-size: 14px; font-weight: 600; color: var(--muted); margin-left: 4px; }
  .charts-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
  @media (min-width: 900px) { .charts-grid { grid-template-columns: 1fr 1fr; } .chart-card-wide { grid-column: span 2; } }
  .chart-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 14px; }
  .chart-title { font-family: var(--display); font-weight: 700; font-size: 14px; margin: 0 0 12px; color: var(--ink); }
  .chart-empty { font-size: 13px; color: var(--muted); text-align: center; padding: 16px 0; margin: 0; }
  .bar-list { display: flex; flex-direction: column; gap: 6px; }
  .bar-row { display: grid; grid-template-columns: 1fr 2fr 36px; gap: 10px; align-items: center; font-size: 12px; }
  .bar-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink-2); }
  .bar-track { background: var(--paper-tint); border-radius: 999px; height: 8px; overflow: hidden; position: relative; }
  .bar-fill { display: block; height: 100%; border-radius: 999px; }
  .bar-count { font-family: var(--mono); font-weight: 700; font-size: 11px; text-align: right; color: var(--ink-2); }
  .status-bars { display: flex; flex-direction: column; gap: 6px; }
  .status-bar { display: flex; align-items: center; gap: 8px; font-size: 12px; }
  .status-color { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
  .status-label { flex: 1; }
  .status-count { font-family: var(--mono); font-weight: 700; }
  .line-chart { width: 100%; height: 200px; display: block; }
  .line-axis { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px; padding: 0 4px; }
</style>
