<script lang="ts">
  import { onMount } from 'svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { goto, invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let canvasEl: HTMLCanvasElement;
  // pdfjs types are heavy and the worker resolution is dynamic — use any-typed handle.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdfDoc = $state<any>(null);
  let currentPage = $state(1);
  let scale = $state(1);
  let loading = $state(true);

  let pinDraft = $state<{ xPct: number; yPct: number } | null>(null);
  let title = $state('');
  let gewerkId = $state('');
  let creating = $state(false);

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
    renderPage();
  }
  function prevPage() {
    if (currentPage <= 1) return;
    currentPage--;
    renderPage();
  }
  function zoom(d: number) {
    scale = Math.max(0.5, Math.min(3, scale + d));
    renderPage();
  }

  function onCanvasClick(e: MouseEvent) {
    const rect = canvasEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    pinDraft = { xPct: x, yPct: y };
    title = '';
    gewerkId = '';
  }

  async function createPin() {
    if (!pinDraft || !title.trim()) return;
    creating = true;
    const fd = new FormData();
    fd.append('title', title);
    fd.append('gewerkId', gewerkId);
    fd.append('planId', parent.plan.id);
    fd.append('page', String(currentPage));
    fd.append('xPct', pinDraft.xPct.toFixed(2));
    fd.append('yPct', pinDraft.yPct.toFixed(2));
    fd.append('priority', '2');
    const res = await fetch(`/${parent.project.id}/maengel/plaene/${parent.plan.id}?/createPin`, {
      method: 'POST',
      body: fd
    });
    creating = false;
    if (res.ok) {
      pinDraft = null;
      toast('Mangel angelegt.');
      await invalidateAll();
    } else {
      toast('Fehler.');
    }
  }

  onMount(loadPdf);

  let pagePins = $derived(parent.defects.filter((d) => d.page === currentPage));
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project.id}/maengel/plaene`}>
    <Icon name="back" size={12} /> Pläne
  </a>

  <div class="plan-toolbar">
    <h2 class="plan-title">{parent.plan.name}</h2>
    <div class="toolbar-spacer"></div>
    <button class="btn btn-ghost btn-sm" onclick={prevPage} disabled={currentPage <= 1}>‹</button>
    <span class="page-info">Seite {currentPage} / {parent.plan.pageCount ?? '?'}</span>
    <button class="btn btn-ghost btn-sm" onclick={nextPage} disabled={!pdfDoc || currentPage >= pdfDoc.numPages}>›</button>
    <button class="btn btn-ghost btn-sm" onclick={() => zoom(-0.25)}>−</button>
    <button class="btn btn-ghost btn-sm" onclick={() => zoom(0.25)}>+</button>
  </div>

  <div class="canvas-wrap">
    {#if loading}
      <div class="empty"><div class="empty-text">Lade Plan…</div></div>
    {/if}
    <div class="canvas-host">
      <canvas bind:this={canvasEl} onclick={onCanvasClick}></canvas>
      {#each pagePins as p (p.id)}
        <a
          class="pin status-{p.status}"
          href={`/${parent.project.id}/maengel/${p.id}`}
          style={`left:${p.xPct}%;top:${p.yPct}%;background:${p.gewerkColor ?? 'var(--red)'}`}
          title={p.title}
        >
          {p.shortId}
        </a>
      {/each}
      {#if pinDraft}
        <span class="pin pin-draft" style={`left:${pinDraft.xPct}%;top:${pinDraft.yPct}%`}>+</span>
      {/if}
    </div>
  </div>
</div>

{#if pinDraft}
  <button class="scrim open" onclick={() => (pinDraft = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Mangel anlegen">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Pin auf Plan · Seite {currentPage}</div>
        <h3 class="sheet-title">Neuer Mangel hier</h3>
      </div>
      <button class="sheet-close" onclick={() => (pinDraft = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
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
  .canvas-wrap { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); overflow: auto; max-height: calc(100dvh - 220px); }
  .canvas-host { position: relative; display: inline-block; }
  .canvas-host canvas { display: block; cursor: crosshair; max-width: 100%; }
  .pin { position: absolute; transform: translate(-50%, -100%); font-family: var(--mono); font-size: 10px; font-weight: 700; color: #fff; padding: 3px 6px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,.2); cursor: pointer; text-decoration: none; white-space: nowrap; }
  .pin-draft { background: var(--ink); }
</style>
