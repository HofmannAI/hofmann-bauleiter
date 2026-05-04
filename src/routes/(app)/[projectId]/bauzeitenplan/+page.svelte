<script lang="ts">
  import Gantt, { type Dependency } from '$lib/components/Gantt.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { criticalPath, criticalPathWithDefects, calculateFloat, propagate, type EngineTask, type EngineDep } from '$lib/gantt/engine';
  import { fmtDate, setProjectExceptions } from '$lib/gantt/calendar';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';

  let { data } = $props();
  let parent = $derived(data);

  // Set project calendar exceptions
  $effect(() => {
    const exc = parent.calExceptions ?? [];
    setProjectExceptions(
      exc.filter(e => e.type === 'holiday').map(e => e.date),
      exc.filter(e => e.type === 'workday').map(e => e.date)
    );
  });

  let selected = $state<string | null>(null);
  let selectedTask = $derived(parent.tasks.find((t) => t.id === selected) ?? null);
  let multiSelected = $state<Set<string>>(new Set());

  // ---- Filters: gewerk + house (multi-select) — persist in URL ----
  let gewerkFilter = $state<Set<string>>(new Set());
  let houseFilter = $state<Set<string>>(new Set());
  type ViewMode = 'next' | 'full';
  let viewMode = $state<ViewMode>('next'); // Default: Next-Ansicht
  let lookahead = $derived<0 | 3 | 4 | 6>(viewMode === 'next' ? 4 : 0);

  // Hydrate from URL once on mount
  $effect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get('gewerke');
    const h = sp.get('haus');
    if (g) gewerkFilter = new Set(g.split(','));
    if (h) houseFilter = new Set(h.split(','));
    if (sp.get('view') === 'full') viewMode = 'full';
  });

  // Persist back to URL
  function syncUrl() {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (gewerkFilter.size) sp.set('gewerke', [...gewerkFilter].join(','));
    else sp.delete('gewerke');
    if (houseFilter.size) sp.set('haus', [...houseFilter].join(','));
    else sp.delete('haus');
    if (viewMode === 'full') sp.set('view', 'full');
    else sp.delete('view');
    const next = sp.toString();
    const url = next ? `?${next}` : page.url.pathname;
    history.replaceState({}, '', url);
  }

  function toggleGewerkFilter(id: string) {
    const next = new Set(gewerkFilter);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    gewerkFilter = next;
    syncUrl();
  }
  function toggleHouseFilter(id: string) {
    const next = new Set(houseFilter);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    houseFilter = next;
    syncUrl();
  }
  $effect(() => {
    void lookahead;
    syncUrl();
  });

  // tasks gefiltert
  let visibleTasks = $derived.by(() => {
    const today = new Date();
    const todayStr = fmtDate(today);
    const byId = new Map(parent.tasks.map((t) => [t.id, t]));
    const isParent = new Set(parent.tasks.filter(t => t.parentId).map(t => t.parentId!));

    // Step 1: filter leaf tasks
    const matches = new Set<string>();
    for (const t of parent.tasks) {
      if (isParent.has(t.id)) continue; // parents checked later

      // Gewerk/House filter
      const houseNames = parent.houses.filter((h) => houseFilter.has(h.id)).map((h) => h.name.toLowerCase());
      const gewerkOk = gewerkFilter.size === 0 || (t.gewerkId != null && gewerkFilter.has(t.gewerkId));
      const houseOk = houseFilter.size === 0 || houseNames.some((hn) => t.name.toLowerCase().includes(hn));
      if (!gewerkOk || !houseOk) continue;

      // Next-Mode: only tasks that overlap with [-2 weeks, +3 weeks] window
      if (viewMode === 'next') {
        const windowStart = new Date(today);
        windowStart.setDate(windowStart.getDate() - 14);
        const windowEnd = new Date(today);
        windowEnd.setDate(windowEnd.getDate() + 21);
        const wStart = fmtDate(windowStart);
        const wEnd = fmtDate(windowEnd);
        // Task overlaps window if task.start <= windowEnd AND task.end >= windowStart
        if (t.startDate > wEnd || t.endDate < wStart) continue;
      }

      matches.add(t.id);
    }

    if (viewMode === 'next') {
      // Next-Mode: keine Sammelbalken — nur Leaf-Tasks zeigen
      // Das gibt die kompakteste Ansicht fuer Mobile
      return parent.tasks.filter((t) => matches.has(t.id));
    }

    // Vollplan: Parents hinzufuegen wenn mindestens 1 Kind sichtbar
    for (const id of [...matches]) {
      let p = byId.get(id)?.parentId ?? null;
      while (p) {
        matches.add(p);
        p = byId.get(p)?.parentId ?? null;
      }
    }

    return parent.tasks.filter((t) => matches.has(t.id));
  });

  // ---- Baseline ----
  let baselineLabel = $state('');
  let activeBaseline = $state<{ taskId: string; plannedStart: string; plannedEnd: string }[]>([]);

  async function loadBaseline(label: string) {
    baselineLabel = label;
    if (!label) {
      activeBaseline = [];
      return;
    }
    try {
      const res = await fetch(`/${parent.project.id}/bauzeitenplan/baseline.json?label=${encodeURIComponent(label)}`);
      if (res.ok) activeBaseline = await res.json();
    } catch (e) {
      console.error(e);
      toast('Baseline konnte nicht geladen werden.');
    }
  }

  let showCritical = $state(false);
  let showDelayProposal = $state(false);

  // Auto-Verzugs-Erkennung
  let overdueTasks = $derived.by(() => {
    const today = new Date().toISOString().slice(0, 10);
    return parent.tasks.filter((t) =>
      t.endDate < today && (t.progressPct ?? 0) < 100 && (t.depth ?? 0) > 0
    );
  });

  let delayProposal = $derived.by(() => {
    if (!showDelayProposal || overdueTasks.length === 0) return [];
    const today = new Date().toISOString().slice(0, 10);
    const engineTasks: EngineTask[] = parent.tasks.map((t) => ({
      id: t.id, startDate: t.startDate, endDate: t.endDate, durationAt: t.durationAt
    }));
    const engineDeps: EngineDep[] = parent.deps.map((d) => ({
      predecessorId: d.predecessorId, successorId: d.successorId,
      type: d.type as 'FS' | 'SS' | 'FF' | 'SF', lagDays: d.lagDays
    }));

    // For each overdue task, simulate moving its end to today
    const allChanges: Array<{ id: string; name: string; oldEnd: string; newEnd: string; delayDays: number }> = [];
    const seen = new Set<string>();
    for (const t of overdueTasks) {
      const diff = propagate(engineTasks, engineDeps, { id: t.id, end: today });
      for (const [id, change] of diff) {
        if (seen.has(id)) continue;
        seen.add(id);
        const task = parent.tasks.find((x) => x.id === id);
        if (task && change.newEnd !== change.oldEnd) {
          const days = Math.round((new Date(change.newEnd).getTime() - new Date(change.oldEnd).getTime()) / 86400000);
          if (days > 0) {
            allChanges.push({ id, name: task.name, oldEnd: change.oldEnd, newEnd: change.newEnd, delayDays: days });
          }
        }
      }
    }
    return allChanges.sort((a, b) => a.delayDays - b.delayDays);
  });

  async function acceptAllDelays() {
    if (overdueTasks.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    // For each overdue task, use applyMove to propagate the change
    for (const t of overdueTasks) {
      const fd = new FormData();
      fd.append('taskId', t.id);
      fd.append('newStart', t.startDate);
      fd.append('newEnd', today);
      await fetch('?/applyMove', { method: 'POST', body: fd });
    }
    toast(`${overdueTasks.length} Termine + Nachfolger verschoben.`);
    showDelayProposal = false;
    await invalidateAll();
  }
  let cpResult = $derived.by(() => {
    if (!showCritical) return { path: new Set<string>(), defectImpacts: [] };
    const engineTasks: EngineTask[] = parent.tasks.map((t) => ({
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      durationAt: t.durationAt
    }));
    const engineDeps: EngineDep[] = parent.deps.map((d) => ({
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      type: d.type as 'FS' | 'SS' | 'FF' | 'SF',
      lagDays: d.lagDays
    }));
    const defectCounts = (parent.taskDefectCounts ?? [])
      .filter((c: { taskId: string | null; open: number }) => c.taskId != null)
      .map((c: { taskId: string | null; open: number }) => ({
        taskId: c.taskId!,
        open: c.open
      }));
    return criticalPathWithDefects(engineTasks, engineDeps, defectCounts);
  });
  let cpIds = $derived(cpResult.path);
  let cpDefectImpacts = $derived(cpResult.defectImpacts);

  let floatMap = $derived.by(() => {
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
    return calculateFloat(tasks, deps);
  });

  type DiffRow = { id: string; name: string; num: string | null; oldStart: string; oldEnd: string; newStart: string; newEnd: string };
  let pendingMove = $state<null | { taskId: string; newStart: string; newEnd: string; diff: DiffRow[] }>(null);

  /* ===== Dependency-CRUD (PR #8) ===== */
  let depPopover = $state<Dependency | null>(null);

  async function createDep(predId: string, succId: string, predHandle: 'start' | 'end', succHandle: 'start' | 'end') {
    // Map handle-pair to type: pred=end + succ=start = FS, pred=start + succ=start = SS,
    // pred=end + succ=end = FF, pred=start + succ=end = SF
    let type: 'FS' | 'SS' | 'FF' | 'SF';
    if (predHandle === 'end' && succHandle === 'start') type = 'FS';
    else if (predHandle === 'start' && succHandle === 'start') type = 'SS';
    else if (predHandle === 'end' && succHandle === 'end') type = 'FF';
    else type = 'SF';

    const fd = new FormData();
    fd.append('predecessorId', predId);
    fd.append('successorId', succId);
    fd.append('type', type);
    fd.append('lagDays', '0');
    const res = await fetch('?/createDep', { method: 'POST', body: fd });
    if (res.ok) {
      toast(`Abhängigkeit angelegt (${type}).`);
      await invalidateAll();
    } else {
      toast('Anlage fehlgeschlagen.');
    }
  }

  async function saveDepEdit(type: Dependency['type'], lagDays: number) {
    if (!depPopover) return;
    const fd = new FormData();
    fd.append('depId', depPopover.id);
    fd.append('type', type);
    fd.append('lagDays', String(lagDays));
    const res = await fetch('?/updateDep', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Abhängigkeit aktualisiert.');
      depPopover = null;
      await invalidateAll();
    }
  }

  async function deleteDep() {
    if (!depPopover) return;
    if (!(await confirm({ title: 'Abhängigkeit löschen?', confirmLabel: 'Löschen', danger: true }))) return;
    const fd = new FormData();
    fd.append('depId', depPopover.id);
    const res = await fetch('?/deleteDep', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Gelöscht.');
      depPopover = null;
      await invalidateAll();
    }
  }

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

  /* ===== Inline Task Creation (BP-04) ===== */
  let showCreate = $state<{ startDate: string } | null>(null);
  let newTaskName = $state('');
  let newTaskGewerkId = $state('');
  let newTaskEndDate = $state('');

  function openCreateSheet(date: string) {
    showCreate = { startDate: date };
    newTaskName = '';
    newTaskGewerkId = '';
    // Default: 5 working days duration
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 6); // roughly 1 week
    newTaskEndDate = endDate.toISOString().slice(0, 10);
  }

  async function submitCreateTask() {
    if (!showCreate || !newTaskName.trim()) return;
    const fd = new FormData();
    fd.append('name', newTaskName.trim());
    fd.append('startDate', showCreate.startDate);
    fd.append('endDate', newTaskEndDate);
    fd.append('gewerkId', newTaskGewerkId);
    const res = await fetch('?/createTask', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Termin erstellt.');
      showCreate = null;
      await invalidateAll();
    } else {
      toast('Fehler beim Erstellen.');
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
    <div class="print-header">
      <h1>{parent.project.name} — Bauzeitenplan</h1>
      <p>Stand: {new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
    </div>
    <div class="gantt-extras">
      <div class="gantt-toolbar-group" style="margin-right:6px">
        <button class="gantt-zoom-btn" class:active={viewMode === 'next'} onclick={() => { viewMode = 'next'; syncUrl(); }}>
          Next
        </button>
        <button class="gantt-zoom-btn" class:active={viewMode === 'full'} onclick={() => { viewMode = 'full'; syncUrl(); }}>
          Vollplan
        </button>
      </div>
      <button class="filter-pill" class:active={showCritical} onclick={() => (showCritical = !showCritical)}>
        Kritisch {#if showCritical}<span class="badge">{cpIds.size}</span>{/if}
      </button>
      {#if showCritical && cpDefectImpacts.length > 0}
        <span class="cp-defect-hint">
          {cpDefectImpacts.length} Mängel auf krit. Pfad (+{cpDefectImpacts.reduce((s, d) => s + d.estimatedDelayDays, 0)}d)
        </span>
      {/if}
      <details class="filter-dropdown">
        <summary class="filter-pill">Ansichten</summary>
        <div class="dropdown-panel">
          {#each parent.savedViews ?? [] as v (v.id)}
            <button class="dropdown-item" onclick={async () => {
              try {
                const f = v.filterJson as { gewerke?: string[]; haus?: string[]; view?: string; critical?: boolean };
                if (f.gewerke) gewerkFilter = new Set(f.gewerke);
                if (f.haus) houseFilter = new Set(f.haus);
                if (f.view === 'full') viewMode = 'full'; else viewMode = 'next';
                if (f.critical) showCritical = f.critical;
                syncUrl();
                toast(`Ansicht "${v.name}" geladen.`);
              } catch { toast('Fehler.'); }
            }}>{v.name}</button>
          {/each}
          <button class="dropdown-item" style="color:var(--blue);font-weight:700" onclick={async () => {
            const name = prompt('Name der Ansicht:');
            if (!name) return;
            const filterJson = JSON.stringify({
              gewerke: [...gewerkFilter],
              haus: [...houseFilter],
              view: viewMode,
              critical: showCritical
            });
            const fd = new FormData();
            fd.append('name', name);
            fd.append('filterJson', filterJson);
            const res = await fetch('?/saveView', { method: 'POST', body: fd });
            if (res.ok) { toast(`Ansicht "${name}" gespeichert.`); await invalidateAll(); }
          }}>+ Aktuelle Ansicht speichern</button>
        </div>
      </details>
      <button class="filter-pill" onclick={() => openCreateSheet(fmtDate(new Date()))}>
        + Termin
      </button>
      <button class="filter-pill" onclick={() => window.print()}>
        PDF
      </button>
      <span class="extras-spacer"></span>
      {#if parent.gewerke.length > 0}
        <details class="filter-dropdown">
          <summary class="filter-pill" class:active={gewerkFilter.size > 0}>
            Gewerk{#if gewerkFilter.size > 0}<span class="badge">{gewerkFilter.size}</span>{/if}
          </summary>
          <div class="dropdown-panel">
            {#each parent.gewerke as g}
              {@const active = gewerkFilter.has(g.id)}
              <label class="dropdown-item">
                <input type="checkbox" checked={active} onchange={() => toggleGewerkFilter(g.id)} />
                <span class="dot" style:background={g.color}></span>
                <span>{g.name}</span>
              </label>
            {/each}
            {#if gewerkFilter.size > 0}
              <button class="dropdown-reset" onclick={() => (gewerkFilter = new Set())}>Zurücksetzen</button>
            {/if}
          </div>
        </details>
      {/if}
      {#if parent.houses.length > 0}
        <details class="filter-dropdown">
          <summary class="filter-pill" class:active={houseFilter.size > 0}>
            Haus{#if houseFilter.size > 0}<span class="badge">{houseFilter.size}</span>{/if}
          </summary>
          <div class="dropdown-panel">
            {#each parent.houses as h}
              {@const active = houseFilter.has(h.id)}
              <label class="dropdown-item">
                <input type="checkbox" checked={active} onchange={() => toggleHouseFilter(h.id)} />
                <span>{h.name}</span>
              </label>
            {/each}
            {#if houseFilter.size > 0}
              <button class="dropdown-reset" onclick={() => (houseFilter = new Set())}>Zurücksetzen</button>
            {/if}
          </div>
        </details>
      {/if}
      <details class="filter-dropdown">
        <summary class="filter-pill" class:active={!!baselineLabel}>
          {baselineLabel ? 'Baseline ✓' : 'Baseline'}
        </summary>
        <div class="dropdown-panel">
          {#if parent.baselineLabels.length === 0}
            <p class="dropdown-empty">Noch keine Baseline.</p>
          {:else}
            <label class="dropdown-item">
              <input type="radio" name="baseline" checked={!baselineLabel} onchange={() => loadBaseline('')} />
              <span>Aus</span>
            </label>
            {#each parent.baselineLabels as bl}
              <label class="dropdown-item">
                <input type="radio" name="baseline" checked={baselineLabel === bl.label} onchange={() => loadBaseline(bl.label)} />
                <span>{bl.label}</span>
              </label>
            {/each}
          {/if}
          <form method="POST" action="?/freezeBaseline" use:enhance={() => async ({ result, update }) => {
            await update();
            if (result.type === 'success') {
              const data = result.data as { label?: string; count?: number } | undefined;
              if (data?.label) {
                toast(`Baseline "${data.label}" eingefroren — ${data.count} Termine`);
                await invalidateAll();
              }
            }
          }} class="freeze-form">
            <button class="btn btn-primary btn-sm btn-block" type="submit">
              <Icon name="archive" size={14} /> Aktuellen Stand einfrieren
            </button>
          </form>
        </div>
      </details>
    </div>
    {#if overdueTasks.length > 0}
      <div class="delay-banner">
        <span class="delay-icon">⚠</span>
        <span class="delay-text"><b>{overdueTasks.length}</b> {overdueTasks.length === 1 ? 'Termin' : 'Termine'} überfällig</span>
        {#if !showDelayProposal}
          <button class="btn btn-ghost btn-sm" onclick={() => (showDelayProposal = true)}>
            Verschiebungs-Vorschlag
          </button>
        {:else}
          {#if delayProposal.length > 0}
            <div class="delay-proposals">
              {#each delayProposal.slice(0, 8) as p}
                <span class="delay-proposal-item">
                  {p.name}: <b>+{p.delayDays}d</b> → {p.newEnd}
                </span>
              {/each}
              {#if delayProposal.length > 8}
                <span class="delay-proposal-item">…und {delayProposal.length - 8} weitere</span>
              {/if}
            </div>
            <button class="btn btn-primary btn-sm" onclick={acceptAllDelays}>
              Alle {delayProposal.length} verschieben
            </button>
          {:else}
            <span class="delay-text">Keine Nachfolger betroffen.</span>
          {/if}
          <button class="btn btn-ghost btn-sm" onclick={() => (showDelayProposal = false)}>
            <Icon name="close" size={12} />
          </button>
        {/if}
      </div>
    {/if}
    {#if multiSelected.size > 0}
      <div class="multi-select-bar">
        <span><b>{multiSelected.size}</b> Termine ausgewählt</span>
        <button class="btn btn-ghost btn-sm" onclick={() => (multiSelected = new Set())}>Abwählen</button>
        <button class="btn btn-danger btn-sm" onclick={async () => {
          if (!(await confirm({ title: `${multiSelected.size} Termine löschen?`, confirmLabel: 'Löschen', danger: true }))) return;
          for (const id of multiSelected) {
            const fd = new FormData();
            fd.append('taskId', id);
            fd.append('newStart', ''); fd.append('newEnd', '');
            // Use a lightweight delete — we need a dedicated action
          }
          toast('Bulk-Löschung noch nicht implementiert.');
        }}>
          <Icon name="delete" size={12} /> Löschen
        </button>
      </div>
    {/if}
    <Gantt
      tasks={visibleTasks as any}
      dependencies={parent.deps as Dependency[]}
      criticalPathIds={cpIds}
      onSelect={(id) => (selected = id)}
      onMove={previewMove}
      onCreateAtDate={openCreateSheet}
      onDepCreate={createDep}
      onDepClick={(id) => (depPopover = parent.deps.find((d) => d.id === id) ?? null)}
      baseline={activeBaseline}
      lookaheadWeeks={lookahead}
      taskDefectCounts={parent.taskDefectCounts}
      floatMap={floatMap}
      highlightedTaskId={selected}
      multiSelected={multiSelected}
      onMultiSelect={(ids) => (multiSelected = ids)}
      backgrounds={parent.backgrounds ?? []}
      bookmarks={parent.bookmarks ?? []}
      infoboxes={parent.infoboxes ?? []}
    />
    {#if parent.gewerke.length > 0}
      <div class="gantt-legend">
        <span class="gantt-legend-title">Legende</span>
        {#each parent.gewerke as g (g.id)}
          <span class="gantt-legend-item">
            <span class="gantt-legend-dot" style={`background:${g.color}`}></span>
            <span>{g.name}</span>
          </span>
        {/each}
        <span class="gantt-legend-item">
          <span class="gantt-legend-dot" style="background:var(--red)">◆</span>
          <span>Meilenstein</span>
        </span>
        <span class="gantt-legend-item">
          <span class="gantt-legend-dot" style="background:transparent;border:2px dashed var(--ink-2)"></span>
          <span>Projektende</span>
        </span>
      </div>
    {/if}
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
      {#if parent.taskDefectCounts.find(c => c.taskId === selectedTask.id && c.total > 0)}
        {@const defectCount = parent.taskDefectCounts.find(c => c.taskId === selectedTask.id)!}
        <a class="btn btn-ghost btn-block" style="margin-top:8px;color:var(--red)" href={`/${parent.project.id}/maengel?taskId=${selectedTask.id}`}>
          <Icon name="file" size={14} /> {defectCount.open} offene Mängel anzeigen ({defectCount.total} gesamt)
        </a>
      {/if}
    </div>
    <div class="sheet-foot">
      <button class="btn btn-ghost btn-block" onclick={() => (selected = null)}>Schließen</button>
    </div>
  </div>
{/if}

{#if depPopover}
  <button class="scrim open" onclick={() => (depPopover = null)} aria-label="Schließen"></button>
  <div class="dialog open" role="dialog" aria-label="Abhängigkeit bearbeiten" style="display:flex">
    <div class="dialog-panel">
      <h3 class="dialog-title">Abhängigkeit bearbeiten</h3>
      <p class="dialog-text">
        {depPopover.type} · Lag {depPopover.lagDays}d
      </p>
      <div class="field">
        <label class="field-label" for="dep-type">Typ</label>
        <select id="dep-type" class="field-input" bind:value={depPopover.type}>
          <option value="FS">FS — Finish-to-Start (Standard)</option>
          <option value="SS">SS — Start-to-Start</option>
          <option value="FF">FF — Finish-to-Finish</option>
          <option value="SF">SF — Start-to-Finish</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="dep-lag">Lag in Arbeitstagen (negativ = Lead)</label>
        <input id="dep-lag" type="number" class="field-input" bind:value={depPopover.lagDays} min="-365" max="365" />
      </div>
      <div class="dialog-actions">
        <button class="btn btn-danger" onclick={deleteDep}>
          <Icon name="delete" size={14} /> Löschen
        </button>
        <span style="flex:1"></span>
        <button class="btn btn-ghost" onclick={() => (depPopover = null)}>Abbrechen</button>
        <button class="btn btn-primary" onclick={() => saveDepEdit(depPopover!.type, depPopover!.lagDays)}>Speichern</button>
      </div>
    </div>
  </div>
{/if}

{#if showCreate}
  <button class="scrim open" onclick={() => (showCreate = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Termin anlegen">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Neuer Termin</div>
        <h3 class="sheet-title">Termin anlegen</h3>
      </div>
      <button class="sheet-close" onclick={() => (showCreate = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <div class="field">
        <label class="field-label" for="ct-name">Name</label>
        <input id="ct-name" type="text" class="field-input" bind:value={newTaskName} placeholder="z.B. Estrich Haus 1" />
      </div>
      <div class="field">
        <label class="field-label" for="ct-gewerk">Gewerk</label>
        <select id="ct-gewerk" class="field-input" bind:value={newTaskGewerkId}>
          <option value="">— ohne Gewerk —</option>
          {#each parent.gewerke as g}
            <option value={g.id}>{g.name}</option>
          {/each}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="ct-start">Start</label>
          <input id="ct-start" type="date" class="field-input" value={showCreate.startDate} onchange={(e) => {
            if (showCreate) showCreate = { ...showCreate, startDate: (e.currentTarget as HTMLInputElement).value };
          }} />
        </div>
        <div class="field">
          <label class="field-label" for="ct-end">Ende</label>
          <input id="ct-end" type="date" class="field-input" bind:value={newTaskEndDate} />
        </div>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn btn-primary btn-block" onclick={submitCreateTask} disabled={!newTaskName.trim()}>
        <Icon name="check" size={14} /> Termin erstellen
      </button>
    </div>
  </div>
{/if}

<style>
  .gantt-page { padding: 0; max-width: none; margin: 0; }
  .gantt-empty { padding: 60px 20px; text-align: center; }
  .gantt-empty-actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; flex-wrap: wrap; }
  .gantt-extras { padding: 10px 14px; background: var(--paper-tint); border-bottom: 1px solid var(--line); display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .extras-spacer { flex: 1; }
  .delay-banner {
    display: flex; align-items: center; gap: var(--stack-md); flex-wrap: wrap;
    padding: 10px 14px; background: rgba(226, 22, 42, 0.06);
    border-bottom: 1px solid rgba(226, 22, 42, 0.15);
  }
  .delay-icon { font-size: 16px; }
  .delay-text { font-size: 13px; color: var(--on-surface); }
  .delay-proposals { display: flex; flex-wrap: wrap; gap: var(--stack-sm); }
  .delay-proposal-item {
    font-size: 12px; padding: 2px 8px; border-radius: var(--r-sm);
    background: var(--surface-container-low); border: 1px solid var(--outline-variant);
  }
  .cp-defect-hint {
    font-size: 12px; font-weight: 500; color: var(--error);
    padding: 4px 8px; border-radius: var(--r-sm);
    background: rgba(226, 22, 42, 0.06);
  }
  .filter-dropdown { position: relative; }
  .filter-dropdown summary { list-style: none; cursor: pointer; }
  .filter-dropdown summary::-webkit-details-marker { display: none; }
  .filter-dropdown[open] summary { background: var(--ink); color: #fff; border-color: var(--ink); }
  .dropdown-panel { position: absolute; top: calc(100% + 4px); right: 0; z-index: 25; min-width: 200px; max-height: 320px; overflow-y: auto; background: var(--paper); border: 1px solid var(--line-strong); border-radius: var(--r-md); box-shadow: var(--shadow-2); padding: 6px; display: flex; flex-direction: column; gap: 2px; }
  .dropdown-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer; font-size: 13px; border-radius: 6px; }
  .dropdown-item:hover { background: var(--paper-tint); }
  .dropdown-item .dot { width: 10px; height: 10px; border-radius: 50%; }
  .dropdown-empty { padding: 10px; color: var(--muted); font-size: 12px; text-align: center; margin: 0; }
  .dropdown-reset { margin-top: 4px; font-size: 12px; color: var(--red); padding: 4px 6px; cursor: pointer; }
  .freeze-form { margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--line); }

  .diff-list { max-height: 280px; overflow-y: auto; margin-bottom: 14px; border: 1px solid var(--line); border-radius: var(--r-md); }
  .diff-row { display: flex; gap: 10px; padding: 8px 12px; border-bottom: 1px solid var(--line); align-items: center; font-size: 13px; }
  .diff-row:last-child { border-bottom: none; }
  .diff-num { font-family: var(--mono); font-size: 11px; color: var(--muted); flex-shrink: 0; min-width: 38px; }
  .diff-name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .diff-dates { font-family: var(--mono); font-size: 11px; color: var(--ink-2); flex-shrink: 0; }
  .multi-select-bar { display: flex; align-items: center; gap: 10px; padding: 8px 14px; background: var(--blue-soft, rgba(59, 108, 196, .08)); border-bottom: 1px solid var(--blue, #3B6CC4); font-size: 13px; }
  .multi-select-bar b { font-family: var(--mono); }

  .print-header { display: none; }
  /* Print/PDF styles */
  @media print {
    .print-header { display: block !important; padding: 0 0 8px; border-bottom: 2px solid #000; margin-bottom: 8px; }
    .print-header h1 { font-family: var(--display); font-size: 18px; font-weight: 800; margin: 0; }
    .print-header p { font-family: var(--mono); font-size: 11px; color: #666; margin: 2px 0 0; }
    :global(.topbar), :global(.tabbar), :global(.sheet), :global(.scrim),
    :global(.dialog), :global(.dep-mode-banner), :global(.toast-container) { display: none !important; }
    .gantt-extras { display: none !important; }
    .multi-select-bar { display: none !important; }
    .gantt-page { padding: 0 !important; margin: 0 !important; }
    .gantt-legend { page-break-inside: avoid; }
  }
  @page { size: A3 landscape; margin: 10mm; }

  .gantt-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; padding: 8px 14px; background: var(--paper-tint); border-top: 1px solid var(--line); font-size: 11px; }
  .gantt-legend-title { font-family: var(--mono); font-weight: 700; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); font-size: 10px; margin-right: 4px; }
  .gantt-legend-item { display: inline-flex; align-items: center; gap: 4px; color: var(--ink-2); }
  .gantt-legend-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; color: #fff; }
</style>
