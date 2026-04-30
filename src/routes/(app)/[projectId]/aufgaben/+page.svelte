<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import type { AufgabeRow } from './+page.server';

  let { data } = $props();

  type Filter = 'alle' | 'ueberfaellig' | 'heute' | 'woche' | 'kommend';
  let filter = $state<Filter>('alle');

  let items = $derived(data.items as AufgabeRow[]);
  let counts = $derived({
    alle: items.length,
    ueberfaellig: items.filter((i) => i.daysFromToday < 0).length,
    heute: items.filter((i) => i.daysFromToday === 0).length,
    woche: items.filter((i) => i.daysFromToday >= 0 && i.daysFromToday <= 7).length,
    kommend: items.filter((i) => i.daysFromToday > 7 && i.daysFromToday <= 14).length
  });

  function applyFilter(arr: AufgabeRow[]): AufgabeRow[] {
    switch (filter) {
      case 'ueberfaellig': return arr.filter((i) => i.daysFromToday < 0);
      case 'heute': return arr.filter((i) => i.daysFromToday === 0);
      case 'woche': return arr.filter((i) => i.daysFromToday >= 0 && i.daysFromToday <= 7);
      case 'kommend': return arr.filter((i) => i.daysFromToday > 7 && i.daysFromToday <= 14);
      default: return arr;
    }
  }

  let visible = $derived(applyFilter(items));

  function relative(days: number, deadline: string | null): string {
    if (!deadline) return '';
    if (days < 0) return `vor ${Math.abs(days)} Tagen — überfällig`;
    if (days === 0) return 'heute';
    if (days === 1) return 'morgen';
    if (days < 7) return `in ${days} Tagen`;
    return fmtDateDe(deadline);
  }

  function bucket(item: AufgabeRow): 'ueberfaellig' | 'woche' | 'kommend' | 'spaeter' {
    if (item.daysFromToday < 0) return 'ueberfaellig';
    if (item.daysFromToday <= 7) return 'woche';
    if (item.daysFromToday <= 14) return 'kommend';
    return 'spaeter';
  }

  let grouped = $derived.by(() => {
    const groups: Record<string, AufgabeRow[]> = { ueberfaellig: [], woche: [], kommend: [], spaeter: [] };
    for (const i of visible) groups[bucket(i)].push(i);
    return groups;
  });

  const GROUP_TITLES = {
    ueberfaellig: 'Überfällig',
    woche: 'Diese Woche',
    kommend: 'Nächste 14 Tage',
    spaeter: 'Später'
  } as const;
</script>

<div class="page">
  <h2 class="section-title">Aufgaben <span class="count">{visible.length}</span></h2>

  <div class="filter-bar">
    <button class="filter-pill" class:active={filter === 'alle'} onclick={() => (filter = 'alle')}>
      Alle <span class="badge">{counts.alle}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'ueberfaellig'} onclick={() => (filter = 'ueberfaellig')}>
      Überfällig <span class="badge">{counts.ueberfaellig}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'heute'} onclick={() => (filter = 'heute')}>
      Heute <span class="badge">{counts.heute}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'woche'} onclick={() => (filter = 'woche')}>
      Diese Woche <span class="badge">{counts.woche}</span>
    </button>
    <button class="filter-pill" class:active={filter === 'kommend'} onclick={() => (filter = 'kommend')}>
      Nächste 14 Tage <span class="badge">{counts.kommend}</span>
    </button>
  </div>

  {#if visible.length === 0}
    {#if filter === 'ueberfaellig'}
      <EmptyState
        variant="success"
        icon="check"
        title="Nichts überfällig."
        description="Alle Termine und Mängel laufen im Zeitplan."
      />
    {:else if filter === 'heute'}
      <EmptyState
        variant="success"
        icon="check"
        title="Heute frei."
        description="Keine Aufgaben für heute fällig."
      />
    {:else if filter === 'woche'}
      <EmptyState
        variant="success"
        icon="calendar"
        title="Diese Woche entspannt."
        description="Keine Aufgaben in den nächsten 7 Tagen fällig."
      />
    {:else}
      <EmptyState
        variant="success"
        icon="check"
        title="Alles im Plan."
        description="Sobald Termine oder Mängel mit Deadline anstehen, tauchen sie hier auf."
      />
    {/if}
  {:else}
    {#each ['ueberfaellig', 'woche', 'kommend', 'spaeter'] as group}
      {#if grouped[group].length > 0}
        <h3 class="aufgabe-group" class:overdue={group === 'ueberfaellig'}>
          {GROUP_TITLES[group as keyof typeof GROUP_TITLES]}
          <span class="count">{grouped[group].length}</span>
        </h3>
        <div class="aufgabe-list">
          {#each grouped[group] as a (a.id)}
            <a class="aufgabe-card" href={a.href} data-overdue={a.daysFromToday < 0} data-prio={a.priority}>
              <span class="aufgabe-stripe" style={`background:${a.gewerkColor ?? '#6B6660'}`}></span>
              <span class="aufgabe-body">
                <span class="aufgabe-line1">
                  {#if a.num}<span class="aufgabe-num">{a.num}</span>{/if}
                  <span class="aufgabe-title">{a.title}</span>
                </span>
                <span class="aufgabe-line2">
                  {#if a.gewerkName}<span>{a.gewerkName}</span>{/if}
                  {#if a.scopeLabel}<span>· {a.scopeLabel}</span>{/if}
                </span>
                <span class="aufgabe-line3" class:overdue={a.daysFromToday < 0}>
                  <Icon name="clock" size={11} />
                  {relative(a.daysFromToday, a.deadline)}
                </span>
              </span>
              {#if a.kind === 'defect'}
                <span class="aufgabe-tag">Mangel</span>
              {/if}
            </a>
          {/each}
        </div>
      {/if}
    {/each}
  {/if}
</div>

<style>
  .aufgabe-group { font-family: var(--display); font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 16px 0 8px; padding: 0 4px; display: flex; align-items: baseline; gap: 8px; }
  .aufgabe-group.overdue { color: var(--red); }
  .aufgabe-group .count { font-family: var(--mono); font-size: 11px; }
  .aufgabe-list { display: flex; flex-direction: column; gap: 6px; }
  .aufgabe-card { display: flex; gap: 10px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; align-items: center; text-decoration: none; color: inherit; }
  .aufgabe-card:hover { border-color: var(--line-strong); transform: translateY(-1px); box-shadow: var(--shadow-1); }
  .aufgabe-card[data-overdue="true"] { background: linear-gradient(to right, var(--tint-red), var(--paper) 35%); border-left: 3px solid var(--red); }
  .aufgabe-card[data-prio="1"] .aufgabe-title { font-weight: 800; }
  .aufgabe-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .aufgabe-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .aufgabe-line1 { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
  .aufgabe-num { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--muted); }
  .aufgabe-title { font-weight: 600; font-size: 14px; color: var(--ink); }
  .aufgabe-line2 { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; display: flex; gap: 4px; flex-wrap: wrap; }
  .aufgabe-line3 { font-family: var(--mono); font-size: 11px; color: var(--ink-2); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .aufgabe-line3.overdue { color: var(--red); font-weight: 700; }
  .aufgabe-tag { font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--amber); background: var(--amber-soft); padding: 3px 7px; border-radius: 999px; text-transform: uppercase; letter-spacing: .04em; flex-shrink: 0; }
</style>
