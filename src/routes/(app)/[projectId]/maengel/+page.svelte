<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import DraftPhotoStrip, { type DraftPhoto } from '$lib/components/DraftPhotoStrip.svelte';
  import StructureTree, { type StructureSelection } from '$lib/components/StructureTree.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
import { matchDefectFilter, groupDefects, type DefectFilterJson, type GroupKey, type VorgangAggregate } from '$lib/db/layoutFilter';
  import { getSignedUrl } from '$lib/storage/photos';
  import { suppressRealtimeFor } from '$lib/stores/realtime';

  let { data } = $props();
  let parent = $derived(data);

  let cropUrls = $state<Record<string, string>>({});

  $effect(() => {
    const ids = parent.defects.filter((d) => d.planCropPath && !cropUrls[d.id]).map((d) => d);
    if (ids.length === 0) return;
    (async () => {
      const next = { ...cropUrls };
      for (const d of ids) {
        if (!d.planCropPath) continue;
        const url = await getSignedUrl('defect-crops', d.planCropPath, 600);
        if (url) next[d.id] = url;
      }
      cropUrls = next;
    })();
  });

  type Status = 'all' | 'open' | 'sent' | 'acknowledged' | 'resolved';
  type FristFilter = 'all' | 'overdue' | 'week' | 'month';
  let statusFilter = $state<Status>('all');
  let gewerkFilter = $state<string>('all');
  let strukturSelection = $state<StructureSelection>({ kind: 'project', houseId: null, apartmentId: null, roomId: null });
  let activeLayoutId = $state<string | null>(null);
  let groupBy = $state<GroupKey | null>(null);
  let selected = $state<Set<string>>(new Set());

  let fristFilter = $state<FristFilter>('all');
  let searchText = $state('');
  let taskIdFilter = $state<string | null>(null);

  // Hydrate taskId filter from URL
  onMount(() => {
    const sp = new URLSearchParams(window.location.search);
    const tid = sp.get('taskId');
    if (tid) taskIdFilter = tid;
  });

  let vorgangMap = $derived.by(() => {
    const m = new Map<string, VorgangAggregate>();
    const list = (parent as unknown as { vorgaenge?: VorgangAggregate[] }).vorgaenge ?? [];
    for (const v of list) m.set(v.defectId, v);
    return m;
  });

  let activeLayout = $derived(parent.layouts.find((l) => l.id === activeLayoutId) ?? null);

  function aptIdsByHouse(houseId: string): Set<string> {
    const out = new Set<string>();
    const h = parent.structure.find((x) => x.id === houseId);
    if (!h) return out;
    for (const a of h.apartments) out.add(a.id);
    return out;
  }

  function defectMatchesStruktur(d: { roomId: string | null; apartmentId: string | null }): boolean {
    if (strukturSelection.kind === 'project') return true;
    if (strukturSelection.kind === 'room') return d.roomId === strukturSelection.roomId;
    if (strukturSelection.kind === 'apartment') return d.apartmentId === strukturSelection.apartmentId;
    if (strukturSelection.kind === 'house' && strukturSelection.houseId) {
      const apts = aptIdsByHouse(strukturSelection.houseId);
      return d.apartmentId != null && apts.has(d.apartmentId);
    }
    return true;
  }

  function applyLayout(id: string | null) {
    activeLayoutId = id;
    const l = parent.layouts.find((x) => x.id === id);
    groupBy = (l?.groupBy as GroupKey | null) ?? null;
    selected = new Set();
  }

  function toggleSelected(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    selected = next;
  }
  function toggleAllVisible(rows: typeof parent.defects) {
    const allSelected = rows.every((r) => selected.has(r.id));
    if (allSelected) selected = new Set();
    else selected = new Set(rows.map((r) => r.id));
  }

  async function bulkSetStatus(status: string) {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.append('ids', Array.from(selected).join(','));
    fd.append('status', status);
    const res = await fetch('?/bulkSetStatus', { method: 'POST', body: fd });
    if (res.ok) {
      toast(`${selected.size} Mängel auf "${status}".`);
      selected = new Set();
      suppressRealtimeFor(2000);
      await invalidateAll();
    }
  }

  async function bulkReportPdf() {
    if (selected.size === 0) return;
    try {
      const { downloadGewerkReport } = await import('$lib/pdf/defectReport');
      const subset = parent.defects.filter((d) => selected.has(d.id));
      const apiDefects = await Promise.all(
        subset.map(async (d) => {
          const r = await fetch(`/${parent.project.id}/maengel/${d.id}/photos.json`);
          const photos = r.ok ? ((await r.json()) as { storagePath: string }[]) : [];
          return {
            id: d.id,
            shortId: d.shortId,
            title: d.title,
            description: null,
            status: d.status,
            deadline: d.deadline,
            photoStoragePaths: photos.map((p) => p.storagePath),
            planCropPath: d.planCropPath ?? null,
            page: d.page,
            xPct: d.xPct != null ? Number(d.xPct) : null,
            yPct: d.yPct != null ? Number(d.yPct) : null
          };
        })
      );
      await downloadGewerkReport({
        projectName: parent.project.name,
        gewerkName: 'Sammelbericht',
        bauleiterName: 'Bauleiter',
        defects: apiDefects
      });
      toast('Sammelbericht heruntergeladen.');
    } catch (e) {
      console.error(e);
      toast('Report-Generierung fehlgeschlagen.');
    }
  }

  // Hydrate from URL once on mount
  onMount(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const s = sp.get('status'); if (s) statusFilter = s as Status;
    const g = sp.get('gewerk'); if (g) gewerkFilter = g;
    const f = sp.get('frist'); if (f) fristFilter = f as FristFilter;
    const q = sp.get('q'); if (q) searchText = q;
  });

  function syncFilterUrl() {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (statusFilter !== 'all') sp.set('status', statusFilter); else sp.delete('status');
    if (gewerkFilter !== 'all') sp.set('gewerk', gewerkFilter); else sp.delete('gewerk');
    if (fristFilter !== 'all') sp.set('frist', fristFilter); else sp.delete('frist');
    if (searchText.trim()) sp.set('q', searchText.trim()); else sp.delete('q');
    const qs = sp.toString();
    history.replaceState({}, '', qs ? `?${qs}` : window.location.pathname);
  }
  $effect(() => { void statusFilter; void gewerkFilter; void fristFilter; void searchText; syncFilterUrl(); });

  function fristMatches(d: { deadline: string | null; status: string }): boolean {
    if (fristFilter === 'all') return true;
    if (!d.deadline) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(d.deadline + 'T00:00:00');
    if (fristFilter === 'overdue') return dl < today && !['resolved', 'accepted', 'rejected'].includes(d.status);
    if (fristFilter === 'week') {
      const wkEnd = new Date(today); wkEnd.setDate(wkEnd.getDate() + 7);
      return dl >= today && dl <= wkEnd;
    }
    if (fristFilter === 'month') {
      const mEnd = new Date(today); mEnd.setDate(mEnd.getDate() + 30);
      return dl >= today && dl <= mEnd;
    }
    return true;
  }

  function searchMatches(d: { title: string; shortId: string | null }): boolean {
    if (!searchText.trim()) return true;
    const q = searchText.toLowerCase().trim();
    return (
      d.title.toLowerCase().includes(q) ||
      (d.shortId ?? '').toLowerCase().includes(q)
    );
  }

  let strukturCounts = $derived.by(() => {
    const houses = new Map<string, number>();
    const aptCounts = new Map<string, number>();
    const roomCounts = new Map<string, number>();
    for (const d of parent.defects) {
      if (d.apartmentId) aptCounts.set(d.apartmentId, (aptCounts.get(d.apartmentId) ?? 0) + 1);
      if (d.roomId) roomCounts.set(d.roomId, (roomCounts.get(d.roomId) ?? 0) + 1);
    }
    for (const h of parent.structure) {
      let n = 0;
      for (const a of h.apartments) n += aptCounts.get(a.id) ?? 0;
      if (n > 0) houses.set(h.id, n);
    }
    return { houses, apartments: aptCounts, rooms: roomCounts, total: parent.defects.length };
  });

  let draftPhotos = $state<DraftPhoto[]>([]);
  let draftPhotosJson = $derived(
    JSON.stringify(
      draftPhotos.map((p) => ({ storagePath: p.storagePath, width: p.width, height: p.height }))
    )
  );

  let visible = $derived(
    parent.defects.filter((d) => {
      if (activeLayout) {
        if (!matchDefectFilter(d, activeLayout.filterJson as DefectFilterJson, vorgangMap)) return false;
      } else {
        if (statusFilter !== 'all') {
          if (statusFilter === 'open' && !['open', 'reopened'].includes(d.status)) return false;
          if (statusFilter === 'sent' && d.status !== 'sent') return false;
          if (statusFilter === 'acknowledged' && d.status !== 'acknowledged') return false;
          if (statusFilter === 'resolved' && !['resolved', 'accepted'].includes(d.status)) return false;
        }
        if (gewerkFilter !== 'all' && d.gewerkId !== gewerkFilter) return false;
      }
      if (taskIdFilter && d.taskId !== taskIdFilter) return false;
      if (!fristMatches(d)) return false;
      if (!searchMatches(d)) return false;
      if (!defectMatchesStruktur(d)) return false;
      return true;
    })
  );

  let groupedVisible = $derived(groupDefects(visible, groupBy, vorgangMap));

  let showCreate = $state(false);
  let showBulk = $state(false);
  let showSend = $state(false);
  let bulkText = $state('');
  let bulkGewerkId = $state('');
  let sendGewerkId = $state('');
  let sendBauleiter = $state('');
  let sending = $state(false);

  // Create-Sheet bound state (so templates can prefill)
  let createSelectedTemplateId = $state<string>('');
  let createTitle = $state('');
  let createGewerkId = $state('');
  let createDeadline = $state('');
  let createPriority = $state<string>('2');
  let createDescription = $state('');
  let createTemplateHinweis = $state<string | null>(null);

  function applyCreateTemplate(id: string) {
    if (!id) {
      createSelectedTemplateId = '';
      createTemplateHinweis = null;
      return;
    }
    const t = parent.templates.find((x) => x.id === id);
    if (!t) return;
    createSelectedTemplateId = id;
    if (!createTitle) createTitle = t.name;
    if (!createDescription) createDescription = t.beschreibung;
    if (t.gewerkId && !createGewerkId) createGewerkId = t.gewerkId;
    if (t.defaultPriority) createPriority = String(t.defaultPriority);
    if (t.defaultFristTage && !createDeadline) {
      const d = new Date();
      d.setDate(d.getDate() + t.defaultFristTage);
      createDeadline = d.toISOString().slice(0, 10);
    }
    createTemplateHinweis = t.fotoHinweis ?? null;
  }

  async function downloadAndSend() {
    if (!sendGewerkId) return;
    sending = true;
    try {
      const { downloadGewerkReport } = await import('$lib/pdf/defectReport');
      const gewerk = parent.gewerke.find((g) => g.id === sendGewerkId);
      const gewerkDefects = parent.defects.filter((d) => d.gewerkId === sendGewerkId);
      // Fetch each defect's photos via API (serialized through page invalidation)
      const apiDefects = await Promise.all(
        gewerkDefects.map(async (d) => {
          const res = await fetch(`/${parent.project.id}/maengel/${d.id}/photos.json`);
          const photos = res.ok ? ((await res.json()) as { storagePath: string }[]) : [];
          return {
            id: d.id,
            shortId: d.shortId,
            title: d.title,
            description: null,
            status: d.status,
            deadline: d.deadline,
            photoStoragePaths: photos.map((p) => p.storagePath),
            planCropPath: d.planCropPath ?? null,
            page: d.page,
            xPct: d.xPct != null ? Number(d.xPct) : null,
            yPct: d.yPct != null ? Number(d.yPct) : null
          };
        })
      );
      await downloadGewerkReport({
        projectName: parent.project.name,
        gewerkName: gewerk?.name ?? 'Gewerk',
        bauleiterName: sendBauleiter || 'Bauleiter',
        defects: apiDefects
      });
      toast('PDF heruntergeladen. Outlook öffnet sich.');
      // Pick contact
      const contact = parent.contacts.find((c) => c.gewerkId === sendGewerkId && c.email);
      if (contact?.email) {
        const subject = encodeURIComponent(`Mängelmeldung ${parent.project.name} - ${gewerk?.name ?? ''}`);
        const body = encodeURIComponent(
          `Sehr geehrte Damen und Herren,\n\n` +
            `anbei die Mängelmeldung zum BV "${parent.project.name}" für das Gewerk ${gewerk?.name ?? ''}.\n\n` +
            `Bitte hängen Sie das soeben heruntergeladene PDF an diese Mail an, bevor Sie sie absenden.\n\n` +
            `Mit freundlichen Grüßen\n${sendBauleiter || 'Bauleiter'}`
        );
        window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
      } else {
        toast('Kein Kontakt mit Email für dieses Gewerk hinterlegt.');
      }
      showSend = false;
    } catch (e) {
      console.error(e);
      toast('Report-Generierung fehlgeschlagen.');
    } finally {
      sending = false;
    }
  }

  const STATUS_LABEL: Record<string, string> = {
    open: 'Offen', sent: 'Gesendet', acknowledged: 'Bestätigt',
    resolved: 'Erledigt', accepted: 'Akzeptiert', rejected: 'Abgelehnt', reopened: 'Wiedereröffnet'
  };
</script>

<div class="page maengel-layout">
  {#if parent.structure.length > 0}
    <StructureTree
      tree={parent.structure}
      selection={strukturSelection}
      counts={strukturCounts}
      onSelect={(s) => (strukturSelection = s)}
    />
  {/if}
  <div class="maengel-main">
  <div class="maengel-header">
    <h2 class="section-title" style="margin:0">Mängel <span class="count">{visible.length}</span></h2>
    <div class="maengel-actions">
      <a class="btn btn-ghost btn-sm" href={`/${parent.project.id}/maengel/plaene`}>
        <Icon name="file" size={14} /> Pläne
      </a>
      <a class="btn btn-ghost btn-sm" href={`/${parent.project.id}/maengel/statistik`}>
        <Icon name="activity" size={14} /> Statistik
      </a>
      <button class="btn btn-ghost btn-sm" onclick={() => (showBulk = true)}>
        <Icon name="list" size={14} /> Aus Protokoll
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => (showSend = true)}>
        <Icon name="send" size={14} /> Versand
      </button>
      <button class="btn btn-primary btn-sm" onclick={() => (showCreate = true)}>
        <Icon name="plus" size={14} /> Mangel
      </button>
    </div>
  </div>

  {#if taskIdFilter}
    <div class="filter-bar">
      <span class="filter-pill active" style="background:var(--red);color:#fff">
        Nur Mängel zu Termin
      </span>
      <button class="filter-pill" onclick={() => { taskIdFilter = null; history.replaceState({}, '', window.location.pathname); }}>
        ✕ Filter aufheben
      </button>
    </div>
  {/if}

  <div class="filter-bar">
    <button class="filter-pill" class:active={statusFilter === 'all'} onclick={() => (statusFilter = 'all')}>Alle</button>
    <button class="filter-pill" class:active={statusFilter === 'open'} onclick={() => (statusFilter = 'open')}>Offen</button>
    <button class="filter-pill" class:active={statusFilter === 'sent'} onclick={() => (statusFilter = 'sent')}>Gesendet</button>
    <button class="filter-pill" class:active={statusFilter === 'acknowledged'} onclick={() => (statusFilter = 'acknowledged')}>Bestätigt</button>
    <button class="filter-pill" class:active={statusFilter === 'resolved'} onclick={() => (statusFilter = 'resolved')}>Erledigt</button>
  </div>

  <div class="filter-bar">
    <button class="filter-pill" class:active={gewerkFilter === 'all'} onclick={() => (gewerkFilter = 'all')}>Alle Gewerke</button>
    {#each parent.gewerke as g (g.id)}
      <button class="filter-pill" class:active={gewerkFilter === g.id} onclick={() => (gewerkFilter = g.id)}>{g.name}</button>
    {/each}
  </div>

<div class="layout-bar">
    <span class="layout-eyebrow">Layout</span>
    <button class="filter-pill" class:active={!activeLayoutId} onclick={() => applyLayout(null)} type="button">— frei —</button>
    {#each parent.layouts as l (l.id)}
      <button class="filter-pill" class:active={activeLayoutId === l.id} title={l.beschreibung ?? l.name} onclick={() => applyLayout(l.id)} type="button">
        <span class="layout-code">{l.code}</span> {l.name}
      </button>
    {/each}
    <span class="layout-spacer"></span>
    <label class="layout-group">
      Gruppieren:
      <select class="filter-input-inline" bind:value={groupBy}>
        <option value={null}>—</option>
        <option value="gewerk">Gewerk</option>
        <option value="status">AN-Status</option>
        <option value="frist">Frist</option>
      </select>
    </label>
  </div>
  {#if selected.size > 0}
    <div class="bulk-bar">
      <span class="bulk-count">{selected.size} ausgewählt</span>
      <button class="btn btn-ghost btn-sm" onclick={bulkReportPdf} type="button">
        <Icon name="file" size={12} /> Sammelbericht PDF
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => bulkSetStatus('acknowledged')} type="button">
        Bestätigen
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => bulkSetStatus('resolved')} type="button">
        Erledigt
      </button>
      <button class="btn btn-ghost btn-sm" onclick={() => (selected = new Set())} type="button">
        <Icon name="close" size={12} /> Abwählen
      </button>
    </div>
  {/if}
  <div class="filter-bar">
    <button class="filter-pill" class:active={fristFilter === 'all'} onclick={() => (fristFilter = 'all')}>Frist: alle</button>
    <button class="filter-pill filter-pill-red" class:active={fristFilter === 'overdue'} onclick={() => (fristFilter = 'overdue')}>Überfällig</button>
    <button class="filter-pill" class:active={fristFilter === 'week'} onclick={() => (fristFilter = 'week')}>Diese Woche</button>
    <button class="filter-pill" class:active={fristFilter === 'month'} onclick={() => (fristFilter = 'month')}>Dieser Monat</button>
    <span class="search-spacer"></span>
    <div class="search-wrap">
      <Icon name="list" size={12} />
      <input
        class="search-input"
        type="search"
        placeholder="Suche (Titel oder M-001)…"
        bind:value={searchText}
      />
      {#if searchText}
        <button class="search-clear" type="button" onclick={() => (searchText = '')} aria-label="Suche löschen">
          <Icon name="close" size={11} />
        </button>
      {/if}
    </div>
  </div>
  {#if visible.length === 0}
    {#if parent.defects.length === 0}
      <EmptyState
        variant="info"
        icon="defect"
        title="Noch keine Mängel."
        description="Lege den ersten Mangel an oder importiere mehrere Zeilen aus einem Protokoll-Text."
      >
        {#snippet cta()}
          <button class="btn btn-primary btn-sm" onclick={() => (showCreate = true)}>
            <Icon name="plus" size={14} /> Ersten Mangel anlegen
          </button>
        {/snippet}
      </EmptyState>
    {:else}
      <EmptyState
        variant="default"
        icon="list"
        title="Keine Treffer im Filter."
        description="Setze die Filter zurück, um alle {parent.defects.length} Mängel zu sehen."
      />
    {/if}
  {:else if groupBy || activeLayout}
    {#each groupedVisible as g (g.key)}
      {#if g.rows.length > 0}
        <h3 class="group-header">
          {g.label}
          <span class="count">{g.rows.length}</span>
          <button class="select-all" onclick={() => toggleAllVisible(g.rows)} type="button" title="Alle in Gruppe auswählen">
            <Icon name="check" size={11} />
          </button>
        </h3>
        <div class="defect-list">
          {#each g.rows as d (d.id)}
            <div class="defect-row" class:selected={selected.has(d.id)}>
              <button class="select-cb" class:checked={selected.has(d.id)} onclick={() => toggleSelected(d.id)} aria-label="Auswählen" type="button">
                {#if selected.has(d.id)}<Icon name="check" size={12} />{/if}
              </button>
              <a class="defect-card" class:overdue={d.deadline && new Date(d.deadline + 'T00:00:00') < new Date()} href={`/${parent.project.id}/maengel/${d.id}`}>
                <span class="defect-stripe" style={`background:${d.gewerkColor ?? '#6B6660'}`}></span>
                <span class="defect-body">
                  <span class="defect-line1">
                    <span class="defect-num">{d.shortId ?? '-'}</span>
                    <span class="defect-title">{d.title}</span>
                  </span>
                  <span class="defect-line2">
                    {#if d.gewerkName}<span>{d.gewerkName}</span>{/if}
                    {#if d.deadline}<span>· Deadline {fmtDateDe(d.deadline)}</span>{/if}
                  </span>
                </span>
                {#if d.priority === 1}<span class="defect-prio">!</span>{/if}
              </a>
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  {:else}
    {#each [['open','Offen'],['reopened','Wiedereröffnet'],['sent','Gesendet'],['acknowledged','Bestätigt'],['resolved','Erledigt'],['accepted','Akzeptiert'],['rejected','Abgelehnt']] as [grpStatus, grpLabel]}
      {@const grp = visible.filter((d) => d.status === grpStatus)}
      {#if grp.length > 0}
        <h3 class="group-header status-{grpStatus}">
          {grpLabel}
          <span class="count">{grp.length}</span>
          <button class="select-all" onclick={() => toggleAllVisible(grp)} type="button" title="Alle in Gruppe auswählen">
            <Icon name="check" size={11} />
          </button>
        </h3>
        <div class="defect-list">
          {#each grp as d (d.id)}
<div class="defect-row" class:selected={selected.has(d.id)}>
              <button class="select-cb" class:checked={selected.has(d.id)} onclick={() => toggleSelected(d.id)} aria-label="Auswählen" type="button">
                {#if selected.has(d.id)}<Icon name="check" size={12} />{/if}
              </button>
              <a class="defect-card" class:overdue={d.deadline && new Date(d.deadline + 'T00:00:00') < new Date()} href={`/${parent.project.id}/maengel/${d.id}`}>
                <span class="defect-stripe" style={`background:${d.gewerkColor ?? '#6B6660'}`}></span>
                {#if d.planCropPath && cropUrls[d.id]}
                  <span class="defect-crop-thumb" aria-label="Plan-Ausschnitt">
                    <img src={cropUrls[d.id]} alt="Plan-Ausschnitt" loading="lazy" />
                  </span>
                {:else if d.planCropPath}
                  <span class="defect-crop-thumb defect-crop-skeleton" aria-hidden="true"></span>
                {/if}
                <span class="defect-body">
                  <span class="defect-line1">
                    <span class="defect-num">{d.shortId ?? '-'}</span>
                    <span class="defect-title">{d.title}</span>
                  </span>
                  <span class="defect-line2">
                    {#if d.gewerkName}<span>{d.gewerkName}</span>{/if}
                    {#if d.deadline}<span>· Deadline {fmtDateDe(d.deadline)}</span>{/if}
                  </span>
                </span>
                {#if d.priority === 1}<span class="defect-prio">!</span>{/if}
              </a>
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  {/if}
  </div>
</div>

{#if showCreate}
  <button class="scrim open" onclick={() => (showCreate = false)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Neuen Mangel anlegen">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Neuer Mangel</div>
        <h3 class="sheet-title">Mangel anlegen</h3>
      </div>
      <button class="sheet-close" onclick={() => (showCreate = false)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <form method="POST" action="?/create" use:enhance={() => async ({ result, update }) => {
      if (createSelectedTemplateId) {
        const fd = new FormData();
        fd.append('id', createSelectedTemplateId);
        await fetch('?/applyTemplate', { method: 'POST', body: fd });
      }
      suppressRealtimeFor(3000);
      if (result.type === 'redirect') {
        await update();
        return;
      }
      await update();
    }} class="sheet-body">
      <DraftPhotoStrip projectId={parent.project.id} bind:photos={draftPhotos} />
      <input type="hidden" name="photos" value={draftPhotosJson} />
      {#if parent.templates.length > 0}
        <div class="field">
          <label class="field-label" for="tpl">Mangel-Template</label>
          <select
            id="tpl"
            class="field-input"
            bind:value={createSelectedTemplateId}
            onchange={(e) => {
              const id = (e.currentTarget as HTMLSelectElement).value;
              applyCreateTemplate(id);
            }}
          >
            <option value="">— frei —</option>
            {#each parent.templates as t (t.id)}
              <option value={t.id}>{t.name}{t.useCount > 0 ? ` (${t.useCount}×)` : ''}</option>
            {/each}
          </select>
          {#if createTemplateHinweis}
            <span class="field-hint">{createTemplateHinweis}</span>
          {/if}
        </div>
      {/if}
      <div class="field">
        <label class="field-label" for="t">Titel</label>
        <input id="t" name="title" class="field-input" bind:value={createTitle} required maxlength="160" />
      </div>
      <div class="field">
        <label class="field-label" for="g">Gewerk</label>
        <select id="g" name="gewerkId" class="field-input" bind:value={createGewerkId}>
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="dl">Deadline</label>
        <input id="dl" name="deadline" type="date" class="field-input" bind:value={createDeadline} />
      </div>
      <div class="field">
        <label class="field-label" for="pr">Priorität</label>
        <select id="pr" name="priority" class="field-input" bind:value={createPriority}>
          <option value="2">Normal</option>
          <option value="1">Hoch</option>
          <option value="3">Niedrig</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="d">Beschreibung</label>
        <textarea id="d" name="description" class="field-input" rows="4" bind:value={createDescription}></textarea>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Anlegen</button>
    </form>
  </div>
{/if}

{#if showSend}
  <button class="scrim open" onclick={() => (showSend = false)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="An Handwerker senden">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">PDF + Outlook</div>
        <h3 class="sheet-title">An Handwerker senden</h3>
      </div>
      <button class="sheet-close" onclick={() => (showSend = false)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <div class="field">
        <label class="field-label" for="sg">Gewerk</label>
        <select id="sg" class="field-input" bind:value={sendGewerkId}>
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}
            {@const cnt = parent.defects.filter((d) => d.gewerkId === g.id).length}
            <option value={g.id} disabled={cnt === 0}>{g.name} ({cnt})</option>
          {/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="sb">Bauleiter (Unterschrift)</label>
        <input id="sb" class="field-input" bind:value={sendBauleiter} placeholder="Vor- und Nachname" />
      </div>
      <p class="field-hint">
        Der Report (PDF) wird heruntergeladen, danach öffnet sich Outlook mit
        einer vorbereiteten Email. <b>PDF dort manuell anhängen</b>, dann senden.
      </p>
    </div>
    <div class="sheet-foot">
      <button class="btn btn-primary btn-block" onclick={downloadAndSend} disabled={sending || !sendGewerkId}>
        <Icon name="send" size={16} /> {sending ? 'Erstelle…' : 'PDF erzeugen & Outlook öffnen'}
      </button>
    </div>
  </div>
{/if}

{#if showBulk}
  <button class="scrim open" onclick={() => (showBulk = false)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Aus Protokoll-Text Mängel extrahieren">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Aus Protokoll-Text</div>
        <h3 class="sheet-title">Mängel extrahieren</h3>
      </div>
      <button class="sheet-close" onclick={() => (showBulk = false)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <form
      method="POST"
      action="?/bulkExtract"
      use:enhance={() => async ({ result, update }) => {
        await update();
        if (result.type === 'success') {
          toast(`${(result.data as { count?: number })?.count ?? 0} Mängel angelegt.`);
          showBulk = false;
          suppressRealtimeFor(3000);
          await invalidateAll();
        }
      }}
      class="sheet-body"
    >
      <div class="field">
        <span class="field-label">Default-Gewerk (optional)</span>
        <select name="gewerkId" bind:value={bulkGewerkId} class="field-input">
          <option value="">— keins —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="t">Eine Zeile = ein Mangel</label>
        <textarea id="t" name="text" bind:value={bulkText} class="field-input" rows="10" placeholder="Mangel 1&#10;Mangel 2&#10;..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" type="submit" disabled={!bulkText.trim()}>Anlegen</button>
    </form>
  </div>
{/if}

<style>
  .maengel-layout { display: grid; grid-template-columns: 1fr; gap: 16px; align-items: start; }
  @media (min-width: 980px) { .maengel-layout { grid-template-columns: 240px 1fr; } }
  .maengel-main { min-width: 0; }
  .maengel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
.layout-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 10px 0; margin-bottom: 12px; border-top: 1px dashed var(--line); border-bottom: 1px dashed var(--line); }
  .layout-eyebrow { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin-right: 4px; }
  .layout-spacer { flex: 1; }
  .layout-group { font-family: var(--mono); font-size: 11px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .filter-input-inline { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 4px 8px; font-size: 12px; font-family: inherit; }
  .layout-code { font-family: var(--mono); font-weight: 700; color: var(--red); margin-right: 4px; }
  .bulk-bar { position: sticky; top: 8px; z-index: 4; display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--glass-frost, var(--paper)); border: 1px solid var(--line-strong); border-radius: var(--r-md); margin-bottom: 12px; box-shadow: var(--shadow-1); }
  .bulk-count { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--red); }
  .defect-row { display: flex; align-items: stretch; gap: 8px; }
  .defect-row.selected .defect-card { background: var(--paper-tint); border-color: var(--red); }
  .select-cb { width: 28px; min-width: 28px; align-self: stretch; display: flex; align-items: center; justify-content: center; border: 1.5px solid var(--line-strong); border-radius: var(--r-sm); background: var(--paper); cursor: pointer; color: var(--paper); }
  .select-cb.checked { background: var(--red); border-color: var(--red); color: #fff; }
  .select-all { background: transparent; border: none; color: var(--muted); cursor: pointer; padding: 2px 6px; }
  .select-all:hover { color: var(--red); }
  .filter-pill-red.active { background: var(--red-soft); color: var(--red); border-color: rgba(227, 6, 19, 0.3); }
  .search-spacer { flex: 1; min-width: 8px; }
  .search-wrap { display: inline-flex; align-items: center; gap: 6px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-sm); padding: 4px 10px; min-width: 220px; }
  .search-wrap:focus-within { border-color: var(--red); }
  .search-input { border: none; background: transparent; outline: none; font: inherit; flex: 1; min-width: 100px; }
  .search-clear { background: none; border: none; color: var(--muted); cursor: pointer; padding: 2px 4px; display: inline-flex; align-items: center; }
  .search-clear:hover { color: var(--red); }
  .maengel-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .defect-list { display: flex; flex-direction: column; gap: 6px; }
  .defect-card { display: flex; gap: 10px; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; text-decoration: none; color: inherit; transition: all .12s; }
  .defect-card:hover { border-color: var(--line-strong); transform: translateX(2px); }
  .defect-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .defect-crop-thumb { width: 60px; height: 45px; flex-shrink: 0; border-radius: var(--r-sm); overflow: hidden; background: var(--grey-soft); border: 1px solid var(--line); display: block; }
  .defect-crop-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .defect-crop-thumb.defect-crop-skeleton { background: linear-gradient(90deg, var(--paper-tint) 0%, var(--grey-soft) 50%, var(--paper-tint) 100%); background-size: 200% 100%; animation: defect-crop-shimmer 1.4s linear infinite; }
  @keyframes defect-crop-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .defect-crop-thumb.defect-crop-skeleton { animation: none; } }
  .defect-body { flex: 1; min-width: 0; }
  .defect-line1 { display: flex; align-items: baseline; gap: 8px; }
  .defect-num { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
  .defect-title { font-weight: 600; font-size: 14px; }
  .defect-line2 { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; display: flex; gap: 4px; flex-wrap: wrap; }
  .defect-status { font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: 0.06px; text-transform: uppercase; padding: 4px 8px; border-radius: var(--r-sm); flex-shrink: 0; }
  .status-open, .status-reopened { background: rgba(226, 22, 42, 0.10); color: var(--primary-container); border: 1px solid rgba(226, 22, 42, 0.30); }
  .status-sent, .status-acknowledged { background: rgba(201, 119, 0, 0.10); color: var(--amber); border: 1px solid rgba(201, 119, 0, 0.30); }
  .status-resolved, .status-accepted { background: rgba(46, 125, 50, 0.10); color: var(--green); border: 1px solid rgba(46, 125, 50, 0.30); }
  .status-rejected { background: var(--surface-container); color: var(--secondary); border: 1px solid var(--outline-variant); }
  .group-header {
    position: sticky; top: 56px; z-index: 10;
    margin: 16px 0 6px; padding: 6px 12px;
    font-family: var(--mono); font-size: 11px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
    border-radius: 999px;
    background: var(--glass-light);
    -webkit-backdrop-filter: var(--blur-std);
    backdrop-filter: var(--blur-std);
    box-shadow: var(--shadow-1);
    display: inline-flex; align-items: center; gap: 8px;
    width: fit-content;
  }
  .group-header.status-open, .group-header.status-reopened { color: var(--primary-container); }
  .group-header.status-sent, .group-header.status-acknowledged { color: var(--amber); }
  .group-header.status-resolved, .group-header.status-accepted { color: var(--green); }
  .group-header.status-rejected { color: var(--secondary); }
  .group-header .count { font-size: 10px; opacity: 0.7; }
  .defect-card.overdue { border-color: rgba(227, 6, 19, 0.3); background: linear-gradient(to right, var(--tint-red), var(--paper) 30%); }
  .defect-prio { font-family: var(--display); font-weight: 900; font-size: 18px; color: var(--red); width: 24px; text-align: center; flex-shrink: 0; }
</style>
