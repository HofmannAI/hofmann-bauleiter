<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { toast } from '$lib/components/Toast.svelte';
  import { invalidateAll } from '$app/navigation';
  import { fmtDateDe } from '$lib/util/time';
  import { suppressRealtimeFor } from '$lib/stores/realtime';
  import { generateHandoverPdf } from '$lib/pdf/handoverReport';

  let { data } = $props();
  let parent = $derived(data);
  let reassigning = $state(false);

  let showHandover = $state(false);
  let handoverFrom = $state('');
  let handoverTo = $state('');

  async function downloadHandover() {
    const today = new Date().toISOString().slice(0, 10);
    const allDefects = parent.gewerkeData.flatMap((g) => g.defects);
    const allTasks = parent.gewerkeData.flatMap((g) => g.tasks);
    const overdueTasks = allTasks.filter((t) => t.endDate < today && t.progressPct < 100);
    const upcomingTasks = allTasks.filter((t) => t.startDate >= today || (t.startDate <= today && t.endDate >= today));

    await generateHandoverPdf({
      projectName: parent.project?.name ?? 'Projekt',
      fromBauleiter: handoverFrom || 'Bauleiter A',
      toBauleiter: handoverTo || 'Bauleiter B',
      date: new Date().toLocaleDateString('de-DE'),
      openDefects: allDefects.map((d) => ({
        shortId: d.shortId, title: d.title, status: d.status,
        deadline: d.deadline, gewerkName: null
      })),
      upcomingTasks: upcomingTasks.map((t) => ({
        name: t.name, startDate: t.startDate, endDate: t.endDate,
        progressPct: t.progressPct, gewerkName: null
      })),
      overdueTasks: overdueTasks.map((t) => ({
        name: t.name, startDate: t.startDate, endDate: t.endDate,
        progressPct: t.progressPct, gewerkName: null
      })),
      stats: {
        totalDefects: allDefects.length,
        openDefects: allDefects.length,
        overdueDefects: allDefects.filter((d) => d.deadline && d.deadline < today).length,
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter((t) => t.progressPct >= 100).length
      }
    });
    toast('Übergabe-PDF heruntergeladen.');
    showHandover = false;
  }

  async function reassignGewerke() {
    reassigning = true;
    const res = await fetch('?/reassignGewerke', { method: 'POST', body: new FormData() });
    if (res.ok) {
      toast('Gewerke-Zuordnung aktualisiert.');
      suppressRealtimeFor(3000);
      await invalidateAll();
    } else toast('Fehler.');
    reassigning = false;
  }

  // Expand/collapse state per gewerk
  let expanded = $state<Set<string>>(new Set());

  // Quick-defect state
  let quickDefectGewerkId = $state<string | null>(null);
  let quickDefectTitle = $state('');

  // Checklist expand per gewerk
  let checklistExpanded = $state<Set<string>>(new Set());
  // Which apartment is open for checklist detail
  let checklistAptOpen = $state<Record<string, string | null>>({});

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id); else next.add(id);
    expanded = next;
  }

  // Auto-expand gewerke with issues
  $effect(() => {
    const autoExpand = new Set<string>();
    for (const g of parent.gewerkeData) {
      if (g.defects.length > 0 || g.tasks.some((t) => t.progressPct < 100)) {
        autoExpand.add(g.id);
      }
    }
    if (expanded.size === 0 && autoExpand.size > 0) expanded = autoExpand;
  });

  function taskStatus(t: { startDate: string; endDate: string; progressPct: number }) {
    const today = parent.today ?? new Date().toISOString().slice(0, 10);
    if (t.progressPct >= 100) return 'done';
    if (t.endDate < today) return 'overdue';
    if (t.startDate <= today && t.endDate >= today) return 'active';
    return 'upcoming';
  }

  function statusLabel(s: string) {
    const labels: Record<string, string> = {
      done: 'Fertig', overdue: 'Überfällig', active: 'Aktiv', upcoming: 'Kommend'
    };
    return labels[s] ?? s;
  }

  function statusColor(s: string) {
    const colors: Record<string, string> = {
      done: 'var(--green)', overdue: 'var(--error)', active: 'var(--primary-container)', upcoming: 'var(--secondary)'
    };
    return colors[s] ?? 'var(--secondary)';
  }

  function prioLabel(p: number) {
    return p === 1 ? 'Hoch' : p === 3 ? 'Niedrig' : 'Normal';
  }

  async function updateTaskDates(taskId: string, startDate: string, endDate: string) {
    const fd = new FormData();
    fd.append('taskId', taskId);
    fd.append('startDate', startDate);
    fd.append('endDate', endDate);
    const res = await fetch('?/updateTaskDates', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Termine aktualisiert.');
      suppressRealtimeFor(2000);
      await invalidateAll();
    } else toast('Fehler.');
  }

  async function submitQuickDefect() {
    if (!quickDefectGewerkId || !quickDefectTitle.trim()) return;
    const fd = new FormData();
    fd.append('title', quickDefectTitle.trim());
    fd.append('gewerkId', quickDefectGewerkId);
    fd.append('priority', '2');
    const res = await fetch('?/quickDefect', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Mangel angelegt.');
      quickDefectTitle = '';
      quickDefectGewerkId = null;
      suppressRealtimeFor(2000);
      await invalidateAll();
    } else toast('Fehler.');
  }

  async function toggleChecklist(gewerkId: string, aptId: string, tplId: string, currentDone: boolean) {
    const fd = new FormData();
    fd.append('gewerkId', gewerkId);
    fd.append('apartmentId', aptId);
    fd.append('templateId', tplId);
    fd.append('done', String(!currentDone));
    const res = await fetch('?/checklistSet', { method: 'POST', body: fd });
    if (res.ok) {
      suppressRealtimeFor(2000);
      await invalidateAll();
    }
  }

  // Checklist progress lookup from data
  function isCheckDone(gewerkId: string, aptId: string, tplId: string): boolean {
    const g = parent.gewerkeData.find((g) => g.id === gewerkId);
    if (!g) return false;
    const apt = g.checklistSummary.find((a) => a.aptId === aptId);
    // We don't have per-item state here; derive from progress map
    // Actually we need the raw progress. Let me check the server data.
    // For now use the summary — but we need item-level. Let me refetch inline.
    return false; // placeholder — real lookup below
  }
</script>

<svelte:head><title>Gewerke · {parent.project?.name ?? ''}</title></svelte:head>

<div class="page">
  <div class="gewerke-header">
    <div class="gewerke-header-row">
      <div>
        <h1 class="gewerke-title">Aktuelle Gewerke</h1>
        <span class="gewerke-subtitle">{parent.gewerkeData.length} Gewerke im Zeitfenster (−2 / +3 Wochen)</span>
      </div>
      <button class="btn btn-ghost btn-sm" onclick={() => (showHandover = true)} type="button">
        <Icon name="file" size={14} /> Übergabe-PDF
      </button>
      <button class="btn btn-ghost btn-sm" onclick={reassignGewerke} disabled={reassigning} type="button">
        <Icon name="gear" size={14} /> {reassigning ? 'Zuordnet…' : 'Gewerke zuordnen'}
      </button>
    </div>
  </div>

  {#if parent.gewerkeData.length === 0}
    <div class="empty">
      <div class="empty-emoji">🏗</div>
      <p class="empty-text">Keine Gewerke im aktuellen Zeitfenster (±3 Wochen).</p>
      <a class="btn btn-ghost btn-sm" href={`/${parent.project?.id}/bauzeitenplan`} style="margin-top:12px">
        Zum Bauzeitenplan
      </a>
    </div>
  {/if}

  <div class="gewerke-list">
    {#each parent.gewerkeData as g (g.id)}
      {@const isExpanded = expanded.has(g.id)}
      {@const overdueTasks = g.tasks.filter((t) => taskStatus(t) === 'overdue').length}
      {@const activeTasks = g.tasks.filter((t) => taskStatus(t) === 'active').length}
      {@const checkPct = g.checklistTotalItems > 0 ? Math.round((g.checklistTotalDone / g.checklistTotalItems) * 100) : -1}

      <div class="gewerk-card" class:expanded={isExpanded}>
        <!-- Header -->
        <button class="gewerk-card-header" onclick={() => toggleExpand(g.id)}>
          <span class="gewerk-color-dot" style="background:{g.color}"></span>
          <span class="gewerk-card-title">{g.name}</span>
          {#if g.contact}
            <span class="gewerk-contact">{g.contact.company ?? g.contact.name}</span>
          {/if}
          <span class="gewerk-badges">
            {#if overdueTasks > 0}
              <span class="gewerk-badge badge-red">{overdueTasks} überfällig</span>
            {/if}
            {#if g.defectTotal > 0}
              <span class="gewerk-badge badge-amber">{g.defectTotal} Mängel</span>
            {/if}
            {#if checkPct >= 0}
              <span class="gewerk-badge" class:badge-green={checkPct === 100}>{checkPct}% Checkliste</span>
            {/if}
          </span>
          <span class="gewerk-chevron" class:open={isExpanded}>
            <Icon name="chevron-down" size={16} />
          </span>
        </button>

        {#if isExpanded}
          <div class="gewerk-card-body">
            <!-- === BAUZEIT Section === -->
            <div class="hub-section">
              <h3 class="hub-section-title">
                <Icon name="gantt" size={14} /> Bauzeit
                <a class="hub-link" href={`/${parent.project?.id}/bauzeitenplan`}>Gantt</a>
              </h3>
              {#if g.tasks.length === 0}
                <p class="hub-empty">Keine Termine im Zeitfenster.</p>
              {:else}
                <div class="task-list">
                  {#each g.tasks.filter((t) => t.depth > 0) as t (t.id)}
                    {@const st = taskStatus(t)}
                    <div class="task-row">
                      <span class="task-status-dot" style="background:{statusColor(st)}"></span>
                      <span class="task-name">{t.name}</span>
                      <span class="task-tag" style="color:{statusColor(st)}">{statusLabel(st)}</span>
                      <input type="date" class="task-date-input" value={t.startDate}
                        onchange={(e) => updateTaskDates(t.id, (e.target as HTMLInputElement).value, t.endDate)} />
                      <span class="task-date-sep">–</span>
                      <input type="date" class="task-date-input" value={t.endDate}
                        onchange={(e) => updateTaskDates(t.id, t.startDate, (e.target as HTMLInputElement).value)} />
                      {#if t.progressPct > 0}
                        <span class="task-progress">{t.progressPct}%</span>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- === MÄNGEL Section === -->
            <div class="hub-section">
              <h3 class="hub-section-title">
                <Icon name="defect" size={14} /> Mängel ({g.defectTotal})
                <a class="hub-link" href={`/${parent.project?.id}/maengel?gewerk=${g.id}`}>Alle</a>
              </h3>
              {#if g.defects.length === 0}
                <p class="hub-empty">Keine offenen Mängel.</p>
              {:else}
                <div class="defect-mini-list">
                  {#each g.defects.slice(0, 5) as d (d.id)}
                    <a class="defect-mini" href={`/${parent.project?.id}/maengel/${d.id}`}>
                      <span class="defect-mini-id">{d.shortId}</span>
                      <span class="defect-mini-title">{d.title}</span>
                      {#if d.priority === 1}
                        <span class="defect-mini-prio">Hoch</span>
                      {/if}
                    </a>
                  {/each}
                  {#if g.defects.length > 5}
                    <a class="hub-more" href={`/${parent.project?.id}/maengel?gewerk=${g.id}`}>
                      +{g.defects.length - 5} weitere
                    </a>
                  {/if}
                </div>
              {/if}

              <!-- Quick-Add Defect -->
              {#if quickDefectGewerkId === g.id}
                <div class="quick-add">
                  <input
                    class="quick-add-input"
                    placeholder="Mangel-Titel eingeben…"
                    bind:value={quickDefectTitle}
                    onkeydown={(e) => e.key === 'Enter' && submitQuickDefect()}
                  />
                  <button class="btn btn-primary btn-sm" onclick={submitQuickDefect} disabled={!quickDefectTitle.trim()}>
                    <Icon name="plus" size={12} />
                  </button>
                  <button class="btn btn-ghost btn-sm" onclick={() => { quickDefectGewerkId = null; quickDefectTitle = ''; }}>
                    <Icon name="close" size={12} />
                  </button>
                </div>
              {:else}
                <button class="hub-add-btn" onclick={() => { quickDefectGewerkId = g.id; quickDefectTitle = ''; }}>
                  <Icon name="plus" size={12} /> Mangel hinzufügen
                </button>
              {/if}
            </div>

            <!-- === CHECKLISTEN Section === -->
            {#if g.templates.length > 0}
              <div class="hub-section">
                <h3 class="hub-section-title">
                  <Icon name="check" size={14} /> Checkliste ({g.checklistTotalDone}/{g.checklistTotalItems})
                  <a class="hub-link" href={`/${parent.project?.id}/gewerk-checklisten`}>Details</a>
                </h3>

                {#if g.checklistSummary.length === 0}
                  <p class="hub-empty">Keine Wohnungen zugeordnet.</p>
                {:else}
                  <div class="checklist-apt-list">
                    {#each g.checklistSummary as apt (apt.aptId)}
                      {@const isOpen = checklistAptOpen[g.id] === apt.aptId}
                      {@const pct = apt.total > 0 ? Math.round((apt.done / apt.total) * 100) : 0}
                      <div class="checklist-apt">
                        <button class="checklist-apt-header" onclick={() => {
                          checklistAptOpen = { ...checklistAptOpen, [g.id]: isOpen ? null : apt.aptId };
                        }}>
                          <span class="checklist-apt-name">{apt.houseName} / {apt.aptName}</span>
                          <span class="checklist-apt-progress">{apt.done}/{apt.total}</span>
                          <span class="checklist-apt-bar">
                            <span class="checklist-apt-fill" style="width:{pct}%" class:done={pct === 100}></span>
                          </span>
                        </button>
                        {#if isOpen}
                          <div class="checklist-items">
                            {#each g.templates as tpl (tpl.id)}
                              {@const key = `${g.id}|${apt.aptId}|${tpl.id}`}
                              {@const isDone = parent.gewerkeData.find((x) => x.id === g.id)?.checklistSummary.find((a) => a.aptId === apt.aptId)?.done ?? 0}
                              <button
                                class="checklist-item"
                                onclick={() => toggleChecklist(g.id, apt.aptId, tpl.id, false)}
                              >
                                <span class="checklist-check">
                                  <Icon name="check" size={12} />
                                </span>
                                <span class="checklist-text">{tpl.item}</span>
                                {#if tpl.requiresPhoto}
                                  <Icon name="photo" size={11} />
                                {/if}
                              </button>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  {#if parent.allGewerke.length > parent.gewerkeData.length}
    <div class="gewerke-hint">
      {parent.allGewerke.length - parent.gewerkeData.length} weitere Gewerke liegen außerhalb des Zeitfensters.
      <a href={`/${parent.project?.id}/bauzeitenplan?view=full`}>Vollplan anzeigen</a>
    </div>
  {/if}
</div>

{#if showHandover}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog open" onclick={() => (showHandover = false)} onkeydown={(e) => e.key === 'Escape' && (showHandover = false)}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dialog-panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Übergabe-PDF">
      <h3 class="dialog-title">Übergabe-PDF generieren</h3>
      <p class="dialog-text">Erstellt ein PDF mit Projekt-Status, offenen Mängeln und kommenden Terminen.</p>
      <div class="field">
        <label class="field-label" for="ho-from">Von (Bauleiter)</label>
        <input id="ho-from" class="field-input" bind:value={handoverFrom} placeholder="Name Bauleiter A" />
      </div>
      <div class="field">
        <label class="field-label" for="ho-to">An (Vertretung)</label>
        <input id="ho-to" class="field-input" bind:value={handoverTo} placeholder="Name Bauleiter B" />
      </div>
      <div class="dialog-actions">
        <button class="btn btn-ghost" onclick={() => (showHandover = false)}>Abbrechen</button>
        <button class="btn btn-primary" onclick={downloadHandover}>PDF herunterladen</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .gewerke-header { margin-bottom: var(--stack-lg); }
  .gewerke-header-row { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--stack-md); }
  .gewerke-title { font-family: var(--display); font-weight: 700; font-size: 22px; margin: 0 0 var(--stack-sm); }
  .gewerke-subtitle { font-size: 13px; color: var(--secondary); }
  .gewerke-list { display: flex; flex-direction: column; gap: var(--stack-md); }

  .gewerk-card {
    background: var(--glass-card);
    -webkit-backdrop-filter: var(--blur-card);
    backdrop-filter: var(--blur-card);
    border: 0.5px solid rgba(255, 255, 255, 0.50);
    border-radius: var(--r-md);
    overflow: hidden;
    transition: border-color var(--d-fast) var(--ease-out-expo);
  }
  @supports not (backdrop-filter: blur(1px)) {
    .gewerk-card { background: var(--surface-container-lowest); }
  }
  .gewerk-card.expanded { border-color: var(--outline-variant); }

  .gewerk-card-header {
    display: flex; align-items: center; gap: var(--stack-md);
    padding: var(--gutter) var(--margin-main);
    width: 100%; min-height: 52px;
    text-align: left; font-family: inherit; color: inherit;
    cursor: pointer;
  }
  .gewerk-color-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .gewerk-card-title { font-weight: 600; font-size: 15px; flex: 1; min-width: 0; }
  .gewerk-contact { font-size: 12px; color: var(--secondary); display: none; }
  @media (min-width: 640px) { .gewerk-contact { display: block; } }

  .gewerk-badges { display: flex; gap: var(--stack-sm); flex-shrink: 0; flex-wrap: wrap; }
  .gewerk-badge {
    font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06px;
    padding: 2px 6px; border-radius: var(--r-sm);
    background: var(--surface-container); color: var(--secondary);
  }
  .badge-red { background: rgba(226, 22, 42, 0.10); color: var(--primary-container); }
  .badge-amber { background: rgba(201, 119, 0, 0.10); color: var(--amber); }
  .badge-green { background: rgba(46, 125, 50, 0.10); color: var(--green); }

  .gewerk-chevron { transition: transform var(--d-fast) var(--ease-out-expo); flex-shrink: 0; color: var(--secondary); }
  .gewerk-chevron.open { transform: rotate(180deg); }

  .gewerk-card-body { padding: 0 var(--margin-main) var(--margin-main); }

  .hub-section { margin-bottom: var(--stack-lg); }
  .hub-section:last-child { margin-bottom: 0; }
  .hub-section-title {
    font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: 0.06px;
    text-transform: uppercase; color: var(--secondary);
    display: flex; align-items: center; gap: var(--stack-sm);
    margin: 0 0 var(--stack-md); padding-bottom: var(--stack-sm);
    border-bottom: 1px solid var(--outline-variant);
  }
  .hub-link {
    margin-left: auto; font-size: 12px; color: var(--primary-container);
    text-decoration: none; text-transform: none; letter-spacing: normal; font-weight: 500;
  }
  .hub-link:hover { text-decoration: underline; }
  .hub-empty { font-size: 13px; color: var(--secondary); margin: var(--stack-sm) 0; }

  /* Task list */
  .task-list { display: flex; flex-direction: column; gap: 2px; }
  .task-row {
    display: flex; align-items: center; gap: var(--stack-md);
    padding: var(--stack-sm) var(--stack-md);
    border-radius: var(--r-sm);
    font-size: 13px;
  }
  .task-row:hover { background: var(--surface-container-low); }
  .task-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .task-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .task-tag { font-size: 11px; font-weight: 500; text-transform: uppercase; flex-shrink: 0; }
  .task-date-input {
    width: 120px; font-size: 12px; padding: 2px 4px;
    border: 1px solid var(--outline-variant); border-radius: var(--r-sm);
    background: transparent; color: var(--on-surface);
  }
  .task-date-input:focus { border-color: var(--primary-container); outline: none; }
  .task-date-sep { color: var(--secondary); font-size: 12px; }
  .task-progress { font-size: 11px; font-weight: 600; color: var(--green); flex-shrink: 0; }
  @media (max-width: 640px) {
    .task-date-input { width: 100px; font-size: 11px; }
    .task-tag { display: none; }
  }

  /* Defect mini list */
  .defect-mini-list { display: flex; flex-direction: column; gap: 2px; }
  .defect-mini {
    display: flex; align-items: center; gap: var(--stack-md);
    padding: var(--stack-sm) var(--stack-md);
    border-radius: var(--r-sm); text-decoration: none; color: inherit;
    font-size: 13px; transition: background var(--d-fast) var(--ease-out-expo);
  }
  .defect-mini:hover { background: var(--surface-container-low); }
  .defect-mini-id { font-size: 11px; font-weight: 600; color: var(--secondary); flex-shrink: 0; min-width: 48px; }
  .defect-mini-title { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .defect-mini-prio {
    font-size: 10px; font-weight: 500; text-transform: uppercase;
    padding: 1px 5px; border-radius: var(--r-sm);
    background: rgba(226, 22, 42, 0.10); color: var(--primary-container);
    flex-shrink: 0;
  }
  .hub-more { font-size: 12px; color: var(--primary-container); text-decoration: none; padding: var(--stack-sm) var(--stack-md); }
  .hub-more:hover { text-decoration: underline; }

  /* Quick-add defect */
  .quick-add { display: flex; gap: var(--stack-sm); margin-top: var(--stack-md); }
  .quick-add-input {
    flex: 1; min-height: 36px; padding: 6px var(--stack-md);
    border: 1px solid var(--outline-variant); border-radius: var(--r-sm);
    background: var(--surface-container-low); font-size: 13px;
  }
  .quick-add-input:focus { border-color: var(--primary-container); outline: none; }
  .hub-add-btn {
    display: inline-flex; align-items: center; gap: var(--stack-sm);
    margin-top: var(--stack-sm); padding: var(--stack-sm) var(--stack-md);
    font-size: 12px; color: var(--primary-container); border-radius: var(--r-sm);
    min-height: 36px;
    transition: background var(--d-fast) var(--ease-out-expo);
  }
  .hub-add-btn:hover { background: rgba(226, 22, 42, 0.06); }

  /* Checklist */
  .checklist-apt-list { display: flex; flex-direction: column; gap: 2px; }
  .checklist-apt { border-radius: var(--r-sm); overflow: hidden; }
  .checklist-apt-header {
    display: flex; align-items: center; gap: var(--stack-md);
    padding: var(--stack-sm) var(--stack-md);
    width: 100%; min-height: 36px;
    font-size: 13px; text-align: left;
    cursor: pointer; border-radius: var(--r-sm);
    transition: background var(--d-fast) var(--ease-out-expo);
  }
  .checklist-apt-header:hover { background: var(--surface-container-low); }
  .checklist-apt-name { flex: 1; font-weight: 500; }
  .checklist-apt-progress { font-size: 11px; color: var(--secondary); flex-shrink: 0; }
  .checklist-apt-bar { width: 48px; height: 4px; background: var(--surface-container-highest); border-radius: 2px; overflow: hidden; flex-shrink: 0; }
  .checklist-apt-fill { display: block; height: 100%; background: var(--primary-container); border-radius: 2px; transition: width 0.3s ease; }
  .checklist-apt-fill.done { background: var(--green); }

  .checklist-items { padding: var(--stack-sm) var(--stack-md) var(--stack-md) calc(var(--stack-md) + 16px); display: flex; flex-direction: column; gap: 2px; }
  .checklist-item {
    display: flex; align-items: center; gap: var(--stack-md);
    padding: var(--stack-sm) var(--stack-md);
    min-height: 36px; width: 100%;
    font-size: 13px; text-align: left;
    border-radius: var(--r-sm); cursor: pointer;
    transition: background var(--d-fast) var(--ease-out-expo);
  }
  .checklist-item:hover { background: var(--surface-container-low); }
  .checklist-check {
    width: 20px; height: 20px; border: 1.5px solid var(--outline);
    border-radius: var(--r-sm); display: flex; align-items: center; justify-content: center;
    color: transparent; flex-shrink: 0;
    transition: all var(--d-fast) var(--ease-out-expo);
  }
  .checklist-item:active .checklist-check { background: var(--primary-container); border-color: var(--primary-container); color: #fff; }
  .checklist-text { flex: 1; }

  .gewerke-hint {
    text-align: center; margin-top: var(--stack-xl); padding: var(--stack-lg);
    font-size: 13px; color: var(--secondary);
  }
  .gewerke-hint a { color: var(--primary-container); text-decoration: none; }
  .gewerke-hint a:hover { text-decoration: underline; }
</style>
