<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import DraftPhotoStrip, { type DraftPhoto } from '$lib/components/DraftPhotoStrip.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { enhance } from '$app/forms';
  import { onMount } from 'svelte';
  import { matchDefectFilter, groupDefects, type DefectFilterJson, type GroupKey, type VorgangAggregate } from '$lib/db/layoutFilter';

  let { data } = $props();
  let parent = $derived(data);

  type Status = 'all' | 'open' | 'sent' | 'acknowledged' | 'resolved';
  let statusFilter = $state<Status>('all');
  let gewerkFilter = $state<string>('all');
  let activeLayoutId = $state<string | null>(null);
  let groupBy = $state<GroupKey | null>(null);
  let selected = $state<Set<string>>(new Set());

  let vorgangMap = $derived.by(() => {
    const m = new Map<string, VorgangAggregate>();
    const list = (parent as unknown as { vorgaenge?: VorgangAggregate[] }).vorgaenge ?? [];
    for (const v of list) m.set(v.defectId, v);
    return m;
  });

  let activeLayout = $derived(parent.layouts.find((l) => l.id === activeLayoutId) ?? null);

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

<div class="page">
  <div class="maengel-header">
    <h2 class="section-title" style="margin:0">Mängel <span class="count">{visible.length}</span></h2>
    <div class="maengel-actions">
      <a class="btn btn-ghost btn-sm" href={`/${parent.project.id}/maengel/plaene`}>
        <Icon name="file" size={14} /> Pläne
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
    <form method="POST" action="?/create" use:enhance class="sheet-body">
      <DraftPhotoStrip projectId={parent.project.id} bind:photos={draftPhotos} />
      <input type="hidden" name="photos" value={draftPhotosJson} />
      <div class="field">
        <label class="field-label" for="t">Titel</label>
        <input id="t" name="title" class="field-input" required maxlength="160" autofocus />
      </div>
      <div class="field">
        <label class="field-label" for="g">Gewerk</label>
        <select id="g" name="gewerkId" class="field-input">
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="dl">Deadline</label>
        <input id="dl" name="deadline" type="date" class="field-input" />
      </div>
      <div class="field">
        <label class="field-label" for="pr">Priorität</label>
        <select id="pr" name="priority" class="field-input">
          <option value="2">Normal</option>
          <option value="1">Hoch</option>
          <option value="3">Niedrig</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="d">Beschreibung</label>
        <textarea id="d" name="description" class="field-input" rows="4"></textarea>
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
  .maengel-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .defect-list { display: flex; flex-direction: column; gap: 6px; }
  .defect-card { display: flex; gap: 10px; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; text-decoration: none; color: inherit; transition: all .12s; }
  .defect-card:hover { border-color: var(--line-strong); transform: translateX(2px); }
  .defect-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .defect-body { flex: 1; min-width: 0; }
  .defect-line1 { display: flex; align-items: baseline; gap: 8px; }
  .defect-num { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
  .defect-title { font-weight: 600; font-size: 14px; }
  .defect-line2 { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; display: flex; gap: 4px; flex-wrap: wrap; }
  .defect-status { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 4px 8px; border-radius: 999px; flex-shrink: 0; }
  .status-open, .status-reopened { background: var(--red-soft); color: var(--red); }
  .status-sent, .status-acknowledged { background: var(--amber-soft); color: var(--amber); }
  .status-resolved, .status-accepted { background: var(--green-soft); color: var(--green); }
  .status-rejected { background: var(--grey-soft); color: var(--muted); }
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
  .group-header.status-open, .group-header.status-reopened { color: var(--red); }
  .group-header.status-sent, .group-header.status-acknowledged { color: var(--amber); }
  .group-header.status-resolved, .group-header.status-accepted { color: var(--green); }
  .group-header.status-rejected { color: var(--muted); }
  .group-header .count { font-size: 10px; opacity: 0.7; }
  .defect-card.overdue { border-color: rgba(227, 6, 19, 0.3); background: linear-gradient(to right, var(--tint-red), var(--paper) 30%); }
  .defect-prio { font-family: var(--display); font-weight: 900; font-size: 18px; color: var(--red); width: 24px; text-align: center; flex-shrink: 0; }
</style>
