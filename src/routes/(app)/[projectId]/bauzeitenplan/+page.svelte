<script lang="ts">
  import Gantt, { type Dependency } from '$lib/components/Gantt.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { invalidateAll, goto } from '$app/navigation';
  import { page } from '$app/state';
  import { criticalPath, calculateFloat, type EngineTask, type EngineDep } from '$lib/gantt/engine';
  import { fmtDate } from '$lib/gantt/calendar';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let selected = $state<string | null>(null);
  let selectedTask = $derived(parent.tasks.find((t) => t.id === selected) ?? null);
  let multiSelected = $state<Set<string>>(new Set());

  // ---- Filters: gewerk + house (multi-select) — persist in URL ----
  let gewerkFilter = $state<Set<string>>(new Set());
  let houseFilter = $state<Set<string>>(new Set());
  let lookahead = $state<0 | 3 | 4 | 6>(4); // Default: 4-Wochen-Lookahead
  let showOverdueOnly = $state(false);

  // Hydrate from URL once on mount
  $effect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const g = sp.get('gewerke');
    const h = sp.get('haus');
    const la = sp.get('la');
    if (g) gewerkFilter = new Set(g.split(','));
    if (h) houseFilter = new Set(h.split(','));
    if (la === '0' || la === '3' || la === '4' || la === '6') lookahead = Number(la) as 0 | 3 | 4 | 6;
    if (sp.get('overdue') === '1') showOverdueOnly = true;
  });

  // Persist back to URL
  function syncUrl() {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (gewerkFilter.size) sp.set('gewerke', [...gewerkFilter].join(','));
    else sp.delete('gewerke');
    if (houseFilter.size) sp.set('haus', [...houseFilter].join(','));
    else sp.delete('haus');
    if (lookahead) sp.set('la', String(lookahead));
    else sp.delete('la');
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

  // tasks gefiltert (hierarchy bleibt: Eltern bleiben sichtbar wenn ein Kind matcht)
  let visibleTasks = $derived.by(() => {
    const today = fmtDate(new Date());
    const hasFilter = gewerkFilter.size > 0 || houseFilter.size > 0 || showOverdueOnly;
    if (!hasFilter) return parent.tasks;

    const houseNames = parent.houses.filter((h) => houseFilter.has(h.id)).map((h) => h.name.toLowerCase());
    const matches = new Set<string>();
    for (const t of parent.tasks) {
      const gewerkOk = gewerkFilter.size === 0 || (t.gewerkId != null && gewerkFilter.has(t.gewerkId));
      const houseOk = houseFilter.size === 0 || houseNames.some((hn) => t.name.toLowerCase().includes(hn));
      const overdueOk = !showOverdueOnly || (t.endDate < today && (t.progressPct ?? 0) < 100);
      if (gewerkOk && houseOk && overdueOk) matches.add(t.id);
    }
    // Add ancestors of every match
    const byId = new Map(parent.tasks.map((t) => [t.id, t]));
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
    <div class="gantt-extras">
      <button class="filter-pill" class:active={lookahead === 0} onclick={() => { lookahead = 0; syncUrl(); }}>
        Vollplan
      </button>
      {#each [3, 4, 6] as const as wks}
        <button class="filter-pill" class:active={lookahead === wks} onclick={() => { lookahead = wks; syncUrl(); }}>
          {wks}W
        </button>
      {/each}
      <button class="filter-pill" class:active={showOverdueOnly} onclick={() => (showOverdueOnly = !showOverdueOnly)} style={showOverdueOnly ? 'background:var(--red);color:#fff;border-color:var(--red)' : ''}>
        Überfällige
      </button>
      <button class="filter-pill" class:active={showCritical} onclick={() => (showCritical = !showCritical)}>
        Kritisch {#if showCritical}<span class="badge">{cpIds.size}</span>{/if}
      </button>
      <button class="filter-pill" onclick={() => openCreateSheet(fmtDate(new Date()))}>
        + Termin
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
      tasks={visibleTasks}
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
</style>
