<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import PinPreview from '$lib/components/PinPreview.svelte';
  import DraftPhotoStrip, { type DraftPhoto } from '$lib/components/DraftPhotoStrip.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { haptic } from '$lib/motion';

  let { data } = $props();
  let parent = $derived(data);

  let canvasEl: HTMLCanvasElement;
  let canvasHostEl: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc = $state<any>(null);
  let currentPage = $state(1);
  let scale = $state(1);
  let loading = $state(true);

  let pinDraft = $state<{ xPct: number; yPct: number } | null>(null);
  let pinDraftPhotos = $state<DraftPhoto[]>([]);
  let title = $state('');
  let gewerkId = $state('');
  let creating = $state(false);

  // Active pin for inline preview-card
  let activePin = $state<string | null>(null);
  let activePinPos = $state<{ x: number; y: number }>({ x: 0, y: 0 });

  // Per-gewerk filter (toggle visibility)
  let hiddenGewerke = $state<Set<string>>(new Set());

  // Drag-pin state
  let draggingPinId = $state<string | null>(null);
  let dragStart = { x: 0, y: 0 };
  let dragOffset = $state({ x: 0, y: 0 });

  async function loadPdf() {
    if (!parent.signedUrl || !canvasEl) return;
    loading = true;
    try {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = await import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default);
      pdfDoc = await pdfjs.getDocument({ url: parent.signedUrl }).promise;
      await renderPage();
    } catch (e) {
      console.error(e);
      toast('Plan konnte nicht geladen werden.');
    } finally {
      loading = false;
    }
  }

  async function renderPage() {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale: scale * 1.5 });
    canvasEl.width = viewport.width;
    canvasEl.height = viewport.height;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  function nextPage() {
    if (!pdfDoc || currentPage >= pdfDoc.numPages) return;
    currentPage++;
    activePin = null;
    renderPage();
  }
  function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    activePin = null;
    renderPage();
  }
  function zoom(d: number) {
    scale = Math.max(0.5, Math.min(3, scale + d));
    activePin = null;
    renderPage();
  }

  function onCanvasClick(e: MouseEvent) {
    // Ignore if clicking right after a drag
    if (draggingPinId) return;
    const rect = canvasEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    pinDraft = { xPct: x, yPct: y };
    title = '';
    gewerkId = '';
    haptic(8);
  }

  async function createPin() {
    if (!pinDraft || !title.trim()) return;
    creating = true;

    // Plan-Crop client-seitig generieren (best-effort, blockiert nicht)
    let planCropPath: string | null = null;
    try {
      const { cropPlanAroundPin } = await import('$lib/util/crop');
      const { uploadPlanCrop } = await import('$lib/storage/photos');
      const blob = await cropPlanAroundPin(canvasEl, pinDraft.xPct, pinDraft.yPct);
      const draftId = crypto.randomUUID();
      const { path } = await uploadPlanCrop(parent.project.id, draftId, blob);
      planCropPath = path;
    } catch (err) {
      // Nicht blockierend — Mangel wird auch ohne Crop angelegt
      console.warn('[plan-crop] failed:', err);
    }

    const fd = new FormData();
    fd.append('title', title);
    fd.append('gewerkId', gewerkId);
    fd.append('planId', parent.plan.id);
    fd.append('page', String(currentPage));
    fd.append('xPct', pinDraft.xPct.toFixed(2));
    fd.append('yPct', pinDraft.yPct.toFixed(2));
    fd.append('priority', '2');
    if (planCropPath) fd.append('planCropPath', planCropPath);
    if (pinDraftPhotos.length > 0) {
      fd.append('photos', JSON.stringify(
        pinDraftPhotos.map((p) => ({ storagePath: p.storagePath, width: p.width, height: p.height }))
      ));
    }
    const res = await fetch(`/${parent.project.id}/maengel/plaene/${parent.plan.id}?/createPin`, { method: 'POST', body: fd });
    creating = false;
    if (res.ok) {
      pinDraft = null;
      pinDraftPhotos = [];
      title = '';
      gewerkId = '';
      toast('Mangel angelegt.');
      haptic(15);
      await invalidateAll();
    } else toast('Fehler.');
  }

  function pinClicked(e: MouseEvent, pinId: string) {
    e.stopPropagation();
    if (activePin === pinId) return;
    const rect = canvasHostEl.getBoundingClientRect();
    activePinPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activePin = pinId;
    haptic(8);
  }

  async function setStatus(defectId: string, status: string) {
    const fd = new FormData();
    fd.append('defectId', defectId);
    fd.append('status', status);
    const res = await fetch(`/${parent.project.id}/maengel/plaene/${parent.plan.id}?/setStatus`, { method: 'POST', body: fd });
    if (res.ok) {
      toast('Status aktualisiert.');
      activePin = null;
      await invalidateAll();
    }
  }

  function onPinPointerDown(e: PointerEvent, pinId: string) {
    e.stopPropagation();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragStart = { x: e.clientX, y: e.clientY };
    dragOffset = { x: 0, y: 0 };
    draggingPinId = pinId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPinPointerMove(e: PointerEvent) {
    if (!draggingPinId) return;
    dragOffset = { x: e.clientX - dragStart.x, y: e.clientY - dragStart.y };
  }
  async function onPinPointerUp(e: PointerEvent, pinId: string) {
    if (!draggingPinId) return;
    const moved = Math.hypot(dragOffset.x, dragOffset.y) > 5;
    if (moved) {
      const rect = canvasEl.getBoundingClientRect();
      const newX = ((e.clientX - rect.left) / rect.width) * 100;
      const newY = ((e.clientY - rect.top) / rect.height) * 100;
      const fd = new FormData();
      fd.append('defectId', pinId);
      fd.append('xPct', Math.max(0, Math.min(100, newX)).toFixed(2));
      fd.append('yPct', Math.max(0, Math.min(100, newY)).toFixed(2));
      await fetch(`/${parent.project.id}/maengel/plaene/${parent.plan.id}?/movePin`, { method: 'POST', body: fd });
      toast('Pin verschoben.');
      await invalidateAll();
    } else {
      // Treat as click
      pinClicked(e as unknown as MouseEvent, pinId);
    }
    draggingPinId = null;
    dragOffset = { x: 0, y: 0 };
  }

  function toggleGewerk(gid: string) {
    const next = new Set(hiddenGewerke);
    if (next.has(gid)) next.delete(gid);
    else next.add(gid);
    hiddenGewerke = next;
    activePin = null;
  }

  let activeDefect = $derived(activePin ? parent.defects.find((d) => d.id === activePin) ?? null : null);

  let showResolved = $state(false);
  const RESOLVED_STATUSES = ['resolved', 'accepted', 'rejected'];

  let pagePins = $derived(
    parent.defects.filter((d) =>
      d.page === currentPage &&
      (!d.gewerkId || !hiddenGewerke.has(d.gewerkId)) &&
      (showResolved || !RESOLVED_STATUSES.includes(d.status))
    )
  );

  // Gewerke present on this plan (for filter chips)
  let gewerkePresent = $derived(
    parent.gewerke.filter((g) => parent.defects.some((d) => d.gewerkId === g.id))
  );

  onMount(loadPdf);
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project.id}/maengel/plaene`}>
    <Icon name="back" size={12} /> Pläne
  </a>

  <div class="plan-toolbar">
    <h2 class="plan-title">{parent.plan.name}</h2>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-ghost btn-sm" onclick={prevPage} disabled={currentPage <= 1} aria-label="Vorherige Seite">‹</button>
    <span class="page-info">Seite {currentPage} / {parent.plan.pageCount ?? '?'}</span>
    <button class="btn btn-ghost btn-sm" onclick={nextPage} disabled={!pdfDoc || currentPage >= pdfDoc.numPages} aria-label="Nächste Seite">›</button>
    <button class="btn btn-ghost btn-sm" onclick={() => zoom(-0.25)} aria-label="Zoom out">−</button>
    <button class="btn btn-ghost btn-sm" onclick={() => zoom(0.25)} aria-label="Zoom in">+</button>
    <button class="btn btn-ghost btn-sm" class:active-toggle={showResolved} onclick={() => (showResolved = !showResolved)} title="Erledigte Pins anzeigen/verbergen">
      <Icon name="eye" size={14} /> {showResolved ? 'Alle' : 'Offene'}
    </button>
  </div>

  {#if gewerkePresent.length > 0}
    <div class="filter-bar">
      {#each gewerkePresent as g (g.id)}
        {@const hidden = hiddenGewerke.has(g.id)}
        <button class="filter-pill" class:active={!hidden} onclick={() => toggleGewerk(g.id)}>
          <span class="filter-dot" style:background={g.color}></span>
          {g.name}
        </button>
      {/each}
    </div>
  {/if}

  <div class="canvas-wrap">
    {#if loading}
      <div class="empty"><div class="empty-text">Lade Plan…</div></div>
    {/if}
    <div class="canvas-host" bind:this={canvasHostEl}>
      <canvas bind:this={canvasEl} onclick={onCanvasClick} aria-label="Plan-Canvas (klicke um Mangel anzulegen)"></canvas>
      {#each pagePins as p (p.id)}
        {@const isDragging = draggingPinId === p.id}
        <button
          class="pin status-{p.status}"
          class:dragging={isDragging}
          style:left={`calc(${p.xPct}% + ${isDragging ? dragOffset.x : 0}px)`}
          style:top={`calc(${p.yPct}% + ${isDragging ? dragOffset.y : 0}px)`}
          style:background={p.gewerkColor ?? 'var(--red)'}
          onpointerdown={(e) => onPinPointerDown(e, p.id)}
          onpointermove={onPinPointerMove}
          onpointerup={(e) => onPinPointerUp(e, p.id)}
          aria-label={`Mangel ${p.shortId}: ${p.title}`}
        >
          {p.shortId}
        </button>
      {/each}
      {#if pinDraft}
        <span class="pin pin-draft" style:left={`${pinDraft.xPct}%`} style:top={`${pinDraft.yPct}%`} aria-hidden="true">+</span>
      {/if}
      {#if activeDefect && activePin}
        <PinPreview
          defectId={activeDefect.id}
          projectId={parent.project.id}
          shortId={activeDefect.shortId}
          title={activeDefect.title}
          status={activeDefect.status}
          gewerkColor={activeDefect.gewerkColor}
          photoStoragePath={parent.defectFirstPhoto[activeDefect.id] ?? null}
          x={activePinPos.x}
          y={activePinPos.y}
          onOpen={() => goto(`/${parent.project.id}/maengel/${activeDefect!.id}`)}
          onClose={() => (activePin = null)}
          onChangeStatus={(s) => setStatus(activeDefect!.id, s)}
        />
      {/if}
    </div>
  </div>
</div>

{#if pinDraft}
  <button class="scrim open" onclick={() => (pinDraft = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Mangel anlegen">
    <div class="sheet-handle-area"><div class="sheet-handle"></div></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Pin auf Plan · Seite {currentPage}</div>
        <h3 class="sheet-title">Neuer Mangel hier</h3>
      </div>
      <button class="sheet-close" onclick={() => (pinDraft = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <DraftPhotoStrip projectId={parent.project.id} bind:photos={pinDraftPhotos} />
      <div class="field">
        <label class="field-label" for="t">Titel</label>
        <input id="t" class="field-input" bind:value={title} placeholder="Kurze Beschreibung" required />
      </div>
      <div class="field">
        <label class="field-label" for="g">Gewerk</label>
        <select id="g" class="field-input" bind:value={gewerkId}>
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn btn-primary btn-block" onclick={createPin} disabled={creating || !title.trim()}>
        {creating ? 'Anlegen…' : 'Mangel anlegen'}
      </button>
    </div>
  </div>
{/if}

<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 12px; text-decoration: none; }
  .plan-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
  .plan-title { font-family: var(--display); font-weight: 800; font-size: 18px; margin: 0; }
  .toolbar-spacer { flex: 1; }
  .page-info { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .active-toggle { background: var(--primary-container); color: var(--on-primary); }
  .filter-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .canvas-wrap { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); overflow: auto; max-height: calc(100dvh - 260px); }
  .canvas-host { position: relative; display: inline-block; }
  .canvas-host canvas { display: block; cursor: crosshair; max-width: 100%; }
  .pin {
    position: absolute; transform: translate(-50%, -100%);
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    color: #fff; padding: 4px 7px; border-radius: 6px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, .25);
    cursor: grab; white-space: nowrap;
    border: 2px solid #fff;
    touch-action: none;
  }
  .pin:hover { transform: translate(-50%, calc(-100% - 2px)) scale(1.05); z-index: 12; }
  .pin.dragging { cursor: grabbing; opacity: 0.8; z-index: 14; transition: none; }
  .pin.status-resolved, .pin.status-accepted { box-shadow: 0 0 0 2px var(--green), 0 2px 6px rgba(0,0,0,.25); }
  .pin.status-sent, .pin.status-acknowledged { box-shadow: 0 0 0 2px var(--amber), 0 2px 6px rgba(0,0,0,.25); }
  .pin.status-rejected { opacity: 0.5; }
  .pin-draft { background: var(--ink); border-color: var(--red); }
</style>
