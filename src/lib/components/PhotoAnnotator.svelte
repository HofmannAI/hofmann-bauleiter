<script lang="ts">
  /**
   * Annotate a defect photo with red circle, arrow, freehand, text overlay.
   * Outputs a new annotated JPG that's uploaded as a separate photo
   * (the original stays untouched).
   */
  import Icon from './Icon.svelte';
  import { compressImage } from '$lib/storage/photos';

  type Tool = 'circle' | 'arrow' | 'freehand' | 'text' | 'stamp';
  type Stroke = { tool: Tool; points: { x: number; y: number }[]; text?: string };

  type Props = {
    sourceUrl: string;
    onCancel: () => void;
    onSave: (annotated: Blob) => Promise<void> | void;
  };
  let { sourceUrl, onCancel, onSave }: Props = $props();

  let canvasEl: HTMLCanvasElement;
  let imgEl: HTMLImageElement | null = null;
  let tool = $state<Tool>('circle');
  let strokes = $state<Stroke[]>([]);
  let drawing = $state(false);
  let current: Stroke | null = null;
  let saving = $state(false);
  let textValue = $state('Mängel hier!');

  const STAMPS = ['Mängel hier!', 'Siehe Foto', 'Nachbessern', 'Abnahme verweigert'];

  $effect(() => {
    if (!canvasEl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgEl = img;
      // Fit canvas to a max of 1600px on the long edge while keeping aspect
      const max = 1600;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      canvasEl.width = Math.round(img.width * scale);
      canvasEl.height = Math.round(img.height * scale);
      redraw();
    };
    img.src = sourceUrl;
  });

  function redraw() {
    if (!canvasEl || !imgEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgEl, 0, 0, canvasEl.width, canvasEl.height);
    for (const s of strokes) drawStroke(ctx, s);
    if (current) drawStroke(ctx, current);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = '#E30613';
    ctx.lineWidth = Math.max(3, canvasEl.width / 400);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#E30613';

    if (s.tool === 'freehand') {
      ctx.beginPath();
      s.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    } else if (s.tool === 'circle' && s.points.length >= 2) {
      const a = s.points[0];
      const b = s.points[s.points.length - 1];
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      ctx.beginPath();
      ctx.arc(a.x, a.y, r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (s.tool === 'arrow' && s.points.length >= 2) {
      const a = s.points[0];
      const b = s.points[s.points.length - 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const ang = Math.atan2(dy, dx);
      const head = Math.max(14, canvasEl.width / 50);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
      ctx.stroke();
    } else if ((s.tool === 'text' || s.tool === 'stamp') && s.points.length >= 1 && s.text) {
      const p = s.points[0];
      const size = Math.max(20, canvasEl.width / 30);
      ctx.font = `700 ${size}px Inter, system-ui, sans-serif`;
      const m = ctx.measureText(s.text);
      const padding = size * 0.3;
      const w = m.width + padding * 2;
      const h = size + padding * 1.2;
      ctx.fillStyle = '#E30613';
      ctx.fillRect(p.x - w / 2, p.y - h / 2, w, h);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.text, p.x, p.y);
    }
  }

  function pointerToCanvas(e: PointerEvent): { x: number; y: number } {
    const rect = canvasEl.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvasEl.width,
      y: ((e.clientY - rect.top) / rect.height) * canvasEl.height
    };
  }

  function onDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drawing = true;
    canvasEl.setPointerCapture(e.pointerId);
    const p = pointerToCanvas(e);
    if (tool === 'text' || tool === 'stamp') {
      current = { tool, points: [p], text: textValue };
      strokes = [...strokes, current];
      current = null;
      drawing = false;
      redraw();
      return;
    }
    current = { tool, points: [p] };
    redraw();
  }
  function onMove(e: PointerEvent) {
    if (!drawing || !current) return;
    current.points.push(pointerToCanvas(e));
    redraw();
  }
  function onUp() {
    if (current) {
      strokes = [...strokes, current];
      current = null;
    }
    drawing = false;
  }

  function undo() {
    strokes = strokes.slice(0, -1);
    redraw();
  }
  function clearAll() {
    strokes = [];
    redraw();
  }

  async function save() {
    if (!canvasEl) return;
    saving = true;
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvasEl.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.85)
      );
      // Re-compress to ensure 1600px max + 0.78 quality consistency
      const file = new File([blob], 'annotated.jpg', { type: 'image/jpeg' });
      const { blob: reBlob } = await compressImage(file);
      await onSave(reBlob);
    } finally {
      saving = false;
    }
  }
</script>

<div class="annotator">
  <div class="annotator-toolbar">
    <button class="btn btn-ghost btn-sm" onclick={onCancel}>Abbrechen</button>
    <div class="tools">
      {#each (['circle', 'arrow', 'freehand', 'stamp'] as const) as t}
        <button class="tool-btn" class:active={tool === t} onclick={() => (tool = t)} aria-label={t}>
          {#if t === 'circle'}◯{:else if t === 'arrow'}↗{:else if t === 'freehand'}✎{:else}✖{/if}
        </button>
      {/each}
    </div>
    <button class="btn btn-ghost btn-sm" onclick={undo} disabled={strokes.length === 0}>↶ Zurück</button>
    <button class="btn btn-ghost btn-sm" onclick={clearAll} disabled={strokes.length === 0}>Alle löschen</button>
    <button class="btn btn-primary btn-sm" onclick={save} disabled={saving || strokes.length === 0}>
      {saving ? 'Speichert…' : 'Speichern'}
    </button>
  </div>
  {#if tool === 'stamp'}
    <div class="stamp-bar">
      {#each STAMPS as s}
        <button class="stamp" class:active={textValue === s} onclick={() => (textValue = s)}>{s}</button>
      {/each}
    </div>
  {/if}
  <div class="canvas-wrap-anno">
    <canvas
      bind:this={canvasEl}
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
      style="touch-action:none"
    ></canvas>
  </div>
</div>

<style>
  .annotator {
    position: fixed; inset: 0; z-index: 250;
    background: rgba(15, 15, 16, 0.95);
    -webkit-backdrop-filter: var(--blur-std);
    backdrop-filter: var(--blur-std);
    display: flex; flex-direction: column;
  }
  .annotator-toolbar {
    display: flex; gap: 8px; align-items: center;
    padding: 12px 14px; background: var(--glass-dark);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    flex-wrap: wrap;
  }
  .tools { display: flex; gap: 4px; background: rgba(255, 255, 255, 0.08); padding: 3px; border-radius: 8px; }
  .tool-btn { width: 36px; height: 36px; border-radius: 6px; color: #fff; font-size: 16px; cursor: pointer; }
  .tool-btn:hover { background: rgba(255, 255, 255, 0.16); }
  .tool-btn.active { background: var(--red); }
  .stamp-bar { display: flex; gap: 6px; padding: 8px 14px; background: rgba(255, 255, 255, 0.04); overflow-x: auto; }
  .stamp { padding: 6px 12px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); color: #fff; font-size: 12px; cursor: pointer; white-space: nowrap; font-family: inherit; }
  .stamp.active { background: var(--red); }
  .canvas-wrap-anno { flex: 1; overflow: auto; display: flex; align-items: center; justify-content: center; padding: 12px; }
  .canvas-wrap-anno canvas { max-width: 100%; max-height: 100%; display: block; touch-action: none; cursor: crosshair; }
</style>
