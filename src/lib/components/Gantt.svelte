<script lang="ts">
  import { parseDate, addDays, daysBetween, fmtDate } from '$lib/gantt/calendar';

  type GTask = {
    id: string;
    num: string | null;
    name: string;
    parentId: string | null;
    startDate: string;
    endDate: string;
    color: string | null;
    depth: number;
    sortOrder: number;
  };

  type Baseline = { taskId: string; plannedStart: string; plannedEnd: string };
  type Props = {
    tasks: GTask[];
    onSelect?: (taskId: string) => void;
    onMove?: (taskId: string, newStart: string, newEnd: string) => void;
    criticalPathIds?: Set<string>;
    baseline?: Baseline[];
    lookaheadWeeks?: 0 | 3 | 4 | 6;
  };
  let { tasks, onSelect, onMove, criticalPathIds = new Set<string>(), baseline = [], lookaheadWeeks = 0 }: Props = $props();

  let baselineMap = $derived.by(() => {
    const m = new Map<string, { plannedStart: string; plannedEnd: string }>();
    for (const b of baseline) m.set(b.taskId, { plannedStart: b.plannedStart, plannedEnd: b.plannedEnd });
    return m;
  });

  let zoom = $state<'day' | 'week' | 'month'>('week');
  let collapsed = $state<Record<string, boolean>>({});

  function dayWidth(): number {
    return zoom === 'day' ? 28 : zoom === 'week' ? 12 : 4;
  }

  let range = $derived.by(() => {
    if (lookaheadWeeks > 0) {
      const today = new Date();
      const start = new Date(today);
      start.setDate(start.getDate() - 3);
      const end = new Date(today);
      end.setDate(end.getDate() + lookaheadWeeks * 7);
      return { start: fmtDate(start), end: fmtDate(end) };
    }
    if (tasks.length === 0) {
      const t = new Date();
      return {
        start: fmtDate(new Date(t.getFullYear(), t.getMonth(), 1)),
        end: fmtDate(new Date(t.getFullYear(), t.getMonth() + 6, 0))
      };
    }
    let min = tasks[0].startDate;
    let max = tasks[0].endDate;
    for (const t of tasks) {
      if (t.startDate < min) min = t.startDate;
      if (t.endDate > max) max = t.endDate;
    }
    return { start: addDays(min, -7), end: addDays(max, 7) };
  });

  let totalDays = $derived(daysBetween(range.start, range.end) + 1);
  let widthPx = $derived(totalDays * dayWidth());

  let isParentMap = $derived.by(() => {
    const m = new Set<string>();
    for (const t of tasks) if (t.parentId) m.add(t.parentId);
    return m;
  });

  function isHidden(t: GTask): boolean {
    let pid = t.parentId;
    while (pid) {
      if (collapsed[pid]) return true;
      const p = tasks.find((x) => x.id === pid);
      pid = p?.parentId ?? null;
    }
    return false;
  }

  let visible = $derived(tasks.filter((t) => !isHidden(t)));

  function offsetPx(date: string): number {
    return daysBetween(range.start, date) * dayWidth();
  }

  function widthFor(t: GTask): number {
    return Math.max(8, (daysBetween(t.startDate, t.endDate) + 1) * dayWidth());
  }

  function weekends(): { left: number; width: number }[] {
    if (zoom === 'month') return []; // too dense to render
    const out: { left: number; width: number }[] = [];
    const start = parseDate(range.start);
    const end = parseDate(range.end);
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow === 0 || dow === 6) {
        const left = daysBetween(range.start, fmtDate(cur)) * dayWidth();
        out.push({ left, width: dayWidth() });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }

  function months(): { label: string; left: number; width: number }[] {
    const out: { label: string; left: number; width: number }[] = [];
    const start = parseDate(range.start);
    const end = parseDate(range.end);
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const monthStart = cur > start ? cur : start;
      const next = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      const monthEnd = next < end ? next : end;
      const left = daysBetween(range.start, fmtDate(monthStart)) * dayWidth();
      const w = (daysBetween(fmtDate(monthStart), fmtDate(monthEnd))) * dayWidth();
      out.push({
        label: cur.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }).toUpperCase(),
        left,
        width: w
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return out;
  }

  function todayPos(): number | null {
    const today = fmtDate(new Date());
    if (today < range.start || today > range.end) return null;
    return daysBetween(range.start, today) * dayWidth();
  }

  /* ===== Drag-to-move (Pointer Events: Maus + Touch) =====
   *
   * Touch braucht Long-Press (Schwelle 350ms) damit Scroll-Geste nicht
   * übernommen wird. Maus startet sofort.
   */
  type DragState = {
    id: string; startDate: string; endDate: string;
    originX: number; previewOffset: number;
    pointerId: number; pointerType: string;
    armed: boolean; // true wenn Long-Press erfüllt (oder Maus)
    moved: boolean; // user bewegt mehr als 4px
  };
  let dragging = $state<DragState | null>(null);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  const TOUCH_LONG_PRESS_MS = 350;
  const MOVE_THRESHOLD_PX = 4;

  function onBarPointerDown(e: PointerEvent, t: GTask) {
    if (!onMove) return;
    if (isParentMap.has(t.id)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const initial: DragState = {
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      originX: e.clientX,
      previewOffset: 0,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      armed: e.pointerType === 'mouse',
      moved: false
    };
    dragging = initial;

    if (e.pointerType !== 'mouse') {
      // Long-press: warten bis 350ms verstrichen sind. Wenn user vorher
      // scrollt (moved > threshold ohne armed), Drag verwerfen.
      pressTimer = setTimeout(() => {
        if (!dragging || dragging.id !== t.id || dragging.moved) return;
        dragging = { ...dragging, armed: true };
        // haptic feedback
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { vibrate?: (n: number) => boolean }).vibrate) {
          (navigator as Navigator & { vibrate: (n: number) => boolean }).vibrate(15);
        }
      }, TOUCH_LONG_PRESS_MS);
    }

    // Wir nutzen pointercapture damit auch Move/Up außerhalb der Bar greifen
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onBarPointerMove(e: PointerEvent) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    const dx = e.clientX - dragging.originX;
    const moved = Math.abs(dx) > MOVE_THRESHOLD_PX;

    if (!dragging.armed) {
      // touch: Bewegung vor Armed-Phase = Scroll-Intent → Drag abbrechen
      if (moved) {
        if (pressTimer) clearTimeout(pressTimer);
        dragging = null;
      } else {
        dragging = { ...dragging, moved };
      }
      return;
    }
    // armed: Drag aktiv, Default verhindern damit Touch nicht scrollt
    e.preventDefault();
    dragging = { ...dragging, previewOffset: dx, moved: true };
  }

  function onBarPointerUp(e: PointerEvent) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    const wasArmed = dragging.armed;
    const offset = dragging.previewOffset;
    const t = { id: dragging.id, startDate: dragging.startDate, endDate: dragging.endDate };
    dragging = null;
    if (!wasArmed || !onMove) return;
    const dxDays = Math.round(offset / dayWidth());
    if (dxDays !== 0) {
      const newStart = addDays(t.startDate, dxDays);
      const newEnd = addDays(t.endDate, dxDays);
      onMove(t.id, newStart, newEnd);
    }
  }

  function onBarPointerCancel(e: PointerEvent) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    dragging = null;
  }
</script>

<div class="gantt-toolbar">
  <div class="gantt-toolbar-group">
    <button class="gantt-zoom-btn" class:active={zoom === 'day'} onclick={() => (zoom = 'day')}>Tag</button>
    <button class="gantt-zoom-btn" class:active={zoom === 'week'} onclick={() => (zoom = 'week')}>Woche</button>
    <button class="gantt-zoom-btn" class:active={zoom === 'month'} onclick={() => (zoom = 'month')}>Monat</button>
  </div>
  <div class="gantt-toolbar-spacer"></div>
  <span class="gantt-info"><b>{tasks.length}</b> Termine</span>
</div>

<div class="gantt-wrap">
  <div class="gantt-list">
    <div class="gantt-list-head">Vorgang</div>
    {#each visible as t (t.id)}
      <button
        class="gantt-row-list depth-{t.depth}"
        onclick={() => onSelect?.(t.id)}
      >
        {#if isParentMap.has(t.id)}
          <span
            class="gantt-list-toggle"
            class:expanded={!collapsed[t.id]}
            onclick={(e) => { e.stopPropagation(); collapsed[t.id] = !collapsed[t.id]; }}
            onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); collapsed[t.id] = !collapsed[t.id]; } }}
            role="button"
            tabindex="-1"
          >▶</span>
        {:else}
          <span class="gantt-list-toggle empty"></span>
        {/if}
        <span class="gantt-list-num">{t.num ?? ''}</span>
        <span class="gantt-list-name">{t.name}</span>
      </button>
    {/each}
  </div>

  <div class="gantt-timeline-wrap">
    <div class="gantt-timeline" style={`width:${widthPx}px`}>
      <div class="gantt-axis">
        {#each months() as m}
          <div class="gantt-axis-month" style={`left:${m.left}px;width:${m.width}px`}>{m.label}</div>
        {/each}
      </div>
      {#each weekends() as w}
        <div class="gantt-weekend" style={`left:${w.left}px;width:${w.width}px`}></div>
      {/each}
      {#if todayPos() !== null}
        <div class="gantt-today-line" style={`left:${todayPos()}px`}>
          <span class="gantt-today-pulse"></span>
          <span class="gantt-today-label">Heute</span>
        </div>
      {/if}
      <div class="gantt-rows">
        {#each visible as t (t.id)}
          {@const bl = baselineMap.get(t.id)}
          <div class="gantt-row depth-{t.depth}">
            {#if bl && !isParentMap.has(t.id)}
              <div
                class="gantt-baseline"
                title={`Soll: ${bl.plannedStart} → ${bl.plannedEnd}`}
                style={`left:${offsetPx(bl.plannedStart)}px;width:${Math.max(8, (daysBetween(bl.plannedStart, bl.plannedEnd) + 1) * dayWidth())}px`}
              ></div>
            {/if}
            {#if isParentMap.has(t.id)}
              <div class="gantt-bar summary" style={`left:${offsetPx(t.startDate)}px;width:${widthFor(t)}px`}></div>
            {:else}
              <button
                class="gantt-bar"
                class:critical={criticalPathIds.has(t.id)}
                class:dimmed={criticalPathIds.size > 0 && !criticalPathIds.has(t.id)}
                class:dragging={dragging?.id === t.id && dragging.armed}
                class:armed-touch={dragging?.id === t.id && dragging.armed && dragging.pointerType !== 'mouse'}
                style={`left:${offsetPx(t.startDate) + (dragging?.id === t.id && dragging.armed ? dragging.previewOffset : 0)}px;width:${widthFor(t)}px;background:${t.color ?? '#3B6CC4'}`}
                onclick={() => { if (!dragging || !dragging.moved) onSelect?.(t.id); }}
                onpointerdown={(e) => onBarPointerDown(e, t)}
                onpointermove={onBarPointerMove}
                onpointerup={onBarPointerUp}
                onpointercancel={onBarPointerCancel}
              >
                <span class="gantt-bar-label">{t.name}</span>
                <span class="gantt-bar-tooltip" role="tooltip">
                  <span class="tooltip-name">{t.name}</span>
                  <span class="tooltip-meta">{t.startDate} → {t.endDate}</span>
                  {#if criticalPathIds.has(t.id)}
                    <span class="tooltip-crit">Kritisch — Verzögerung wirkt 1:1 auf Übergabe</span>
                  {/if}
                </span>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .gantt-toolbar {
    display: flex; align-items: center; gap: 6px;
    padding: 10px 14px; background: var(--paper);
    border-bottom: 1px solid var(--line);
    flex-wrap: wrap; position: sticky; top: 51px; z-index: 30;
  }
  .gantt-toolbar-group {
    display: flex; gap: 4px; align-items: center;
    background: var(--paper-tint); padding: 3px;
    border-radius: 8px; border: 1px solid var(--line);
  }
  .gantt-zoom-btn {
    padding: 5px 10px;
    font-family: var(--mono); font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em;
    color: var(--muted); border-radius: 5px; transition: all .12s;
    cursor: pointer;
  }
  .gantt-zoom-btn:hover { color: var(--ink); }
  .gantt-zoom-btn.active { background: var(--ink); color: #fff; }
  .gantt-toolbar-spacer { flex: 1; }
  .gantt-info {
    font-family: var(--mono); font-size: 11px;
    color: var(--muted); text-transform: uppercase; letter-spacing: .04em;
  }
  .gantt-info :global(b) { color: var(--ink-2); }

  .gantt-wrap {
    display: flex; background: var(--paper);
    height: calc(100dvh - 51px - 49px - 80px); min-height: 480px;
    overflow: hidden; border-top: 1px solid var(--line);
  }
  .gantt-list {
    flex-shrink: 0; width: 300px;
    border-right: 1px solid var(--line-strong);
    background: var(--paper);
    overflow-y: auto; overflow-x: hidden; scrollbar-width: thin;
  }
  @media (max-width: 640px) { .gantt-list { width: 200px; } }
  .gantt-list-head {
    position: sticky; top: 0; z-index: 5;
    background: var(--paper-tint); border-bottom: 1px solid var(--line);
    height: 60px; display: flex; align-items: flex-end;
    padding: 0 12px 8px;
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .05em; color: var(--muted);
  }
  .gantt-row-list {
    height: 32px; display: flex; align-items: center;
    padding: 0 8px 0 0; border-bottom: 1px solid var(--line);
    font-size: 13px; cursor: pointer; transition: background .12s;
    width: 100%; text-align: left; font-family: inherit; color: inherit;
  }
  .gantt-row-list:hover { background: var(--paper-tint); }
  .gantt-row-list.depth-0 {
    font-weight: 800; font-family: var(--display); font-size: 13px;
    background: var(--paper-tint);
  }
  .gantt-row-list.depth-0:hover { background: var(--grey-soft); }
  .gantt-row-list.depth-1 { font-weight: 700; }
  .gantt-list-toggle {
    width: 18px; height: 18px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; color: var(--muted);
    transition: transform .15s; cursor: pointer;
  }
  .gantt-list-toggle.expanded { transform: rotate(90deg); }
  .gantt-list-toggle.empty { visibility: hidden; }
  .gantt-list-num {
    font-family: var(--mono); font-size: 10px;
    color: var(--muted); font-weight: 700;
    flex-shrink: 0; min-width: 38px; letter-spacing: -.02em;
  }
  .gantt-list-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gantt-row-list.depth-1 .gantt-list-name { padding-left: 6px; }
  .gantt-row-list.depth-2 .gantt-list-name { padding-left: 14px; font-size: 12.5px; color: var(--ink-2); }

  .gantt-timeline-wrap { flex: 1; overflow: auto; position: relative; background: var(--paper); scrollbar-width: thin; }
  .gantt-timeline { position: relative; }
  .gantt-axis {
    position: sticky; top: 0; z-index: 5;
    background: var(--paper-tint);
    border-bottom: 1px solid var(--line-strong);
    height: 60px;
  }
  .gantt-axis-month {
    position: absolute; top: 0; height: 30px;
    border-right: 1px solid var(--line);
    display: flex; align-items: center; justify-content: flex-start;
    font-family: var(--display); font-size: 12px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
    color: var(--ink); padding: 0 8px;
    white-space: nowrap; overflow: hidden;
  }
  .gantt-weekend {
    position: absolute; top: 60px; bottom: 0;
    background: repeating-linear-gradient(
      135deg,
      rgba(15, 15, 16, 0.018) 0,
      rgba(15, 15, 16, 0.018) 4px,
      rgba(15, 15, 16, 0.04) 4px,
      rgba(15, 15, 16, 0.04) 8px
    );
    pointer-events: none;
    z-index: 1;
  }
  .gantt-today-line {
    position: absolute; top: 30px; bottom: 0; width: 2px;
    background: var(--red); z-index: 8; pointer-events: none;
    box-shadow: 0 0 0 1px rgba(227, 6, 19, .2);
  }
  .gantt-today-label {
    position: absolute; left: -14px; top: 0;
    background: var(--red); color: #fff;
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: .04em;
    white-space: nowrap;
  }
  .gantt-today-pulse {
    position: absolute; left: -3px; top: -3px;
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--red);
    animation: pulse 2s ease-out infinite;
  }
  @keyframes pulse {
    0%   { box-shadow: 0 0 0 0 rgba(227, 6, 19, 0.55); }
    70%  { box-shadow: 0 0 0 14px rgba(227, 6, 19, 0); }
    100% { box-shadow: 0 0 0 0 rgba(227, 6, 19, 0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .gantt-today-pulse { animation: none; }
  }
  .gantt-rows { position: relative; }
  .gantt-row { position: relative; height: 32px; border-bottom: 1px solid var(--line); }
  .gantt-row.depth-0 { background: var(--paper-tint); }
  .gantt-row:hover { background: rgba(227, 6, 19, .03); }
  .gantt-bar {
    position: absolute; top: 6px; height: 20px;
    background: var(--blue); border-radius: 4px;
    cursor: pointer; display: flex; align-items: center;
    padding: 0 6px;
    font-family: var(--mono); font-size: 10px; font-weight: 700;
    color: #fff; white-space: nowrap; overflow: hidden;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .1); transition: all .12s;
    min-width: 8px; border: none;
  }
  .gantt-bar:hover { transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0, 0, 0, .18); z-index: 6; }
  .gantt-bar.critical {
    box-shadow: 0 0 0 2px var(--red), 0 1px 2px rgba(0,0,0,.1);
    animation: critPulse 2.4s ease-in-out infinite;
  }
  @keyframes critPulse {
    0%   { filter: brightness(1.0); }
    50%  { filter: brightness(1.18); }
    100% { filter: brightness(1.0); }
  }
  @media (prefers-reduced-motion: reduce) { .gantt-bar.critical { animation: none; } }
  .gantt-bar.dragging { opacity: .7; cursor: grabbing; z-index: 9; }
  .gantt-bar.armed-touch { box-shadow: 0 0 0 3px var(--red), 0 4px 14px rgba(227, 6, 19, 0.35); }
  .gantt-bar { touch-action: pan-y; }
  .gantt-baseline {
    position: absolute; top: 22px; height: 4px;
    background: transparent;
    border: 1.5px dashed rgba(15, 15, 16, 0.45);
    border-radius: 2px;
    pointer-events: none;
    z-index: 1;
  }
  .gantt-bar.dimmed { opacity: 0.32; filter: saturate(0.6); transition: opacity var(--d-std) var(--ease-out-expo); }
  .gantt-bar.dimmed:hover { opacity: 0.7; }
  .tooltip-crit {
    display: block;
    margin-top: 4px;
    padding: 3px 6px;
    background: var(--red);
    color: #fff;
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
  }
  .gantt-bar { cursor: grab; }
  .gantt-bar-label { display: block; }
  .gantt-bar-tooltip {
    position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: var(--glass-dark);
    -webkit-backdrop-filter: var(--blur-std);
    backdrop-filter: var(--blur-std);
    color: #fff;
    padding: 6px 10px; border-radius: 8px;
    box-shadow: var(--shadow-2);
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--d-fast) var(--ease-out-expo),
                transform var(--d-fast) var(--ease-out-expo);
    z-index: 30;
    white-space: nowrap;
    display: flex; flex-direction: column; gap: 2px;
  }
  .gantt-bar-tooltip .tooltip-name { font-family: var(--display); font-weight: 700; font-size: 12px; }
  .gantt-bar-tooltip .tooltip-meta { font-family: var(--mono); font-size: 10px; opacity: 0.8; }
  .gantt-bar:hover .gantt-bar-tooltip { opacity: 1; transform: translateX(-50%) scale(1); }
  .gantt-bar.summary {
    height: 8px; top: 12px; border-radius: 2px;
    background: linear-gradient(180deg, var(--ink) 0%, var(--ink-2) 100%);
    font-size: 0; pointer-events: none;
  }
</style>
