<script lang="ts">
  import { parseDate, addDays, daysBetween, fmtDate, isNonWorkdayFull, holidayName } from '$lib/gantt/calendar';

  type Segment = { start: string; end: string };
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
    progressPct?: number;
    durationAt?: number | null;
    segments?: Segment[] | null;
    reminderDate?: string | null;
  };

  type TaskDefectCount = { taskId: string | null; total: number; open: number };

  type Baseline = { taskId: string; plannedStart: string; plannedEnd: string };
  export type Dependency = {
    id: string;
    predecessorId: string;
    successorId: string;
    type: 'FS' | 'SS' | 'FF' | 'SF';
    lagDays: number;
  };
  type DepHandle = 'start' | 'end';
  type Props = {
    tasks: GTask[];
    onSelect?: (taskId: string) => void;
    onMove?: (taskId: string, newStart: string, newEnd: string) => void;
    onCreateAtDate?: (date: string) => void;
    onDepCreate?: (predecessorId: string, successorId: string, predHandle: DepHandle, succHandle: DepHandle) => void;
    onDepClick?: (depId: string) => void;
    criticalPathIds?: Set<string>;
    baseline?: Baseline[];
    dependencies?: Dependency[];
    lookaheadWeeks?: 0 | 3 | 4 | 6;
    taskDefectCounts?: TaskDefectCount[];
    floatMap?: Map<string, number>;
    highlightedTaskId?: string | null;
    multiSelected?: Set<string>;
    onMultiSelect?: (ids: Set<string>) => void;
    backgrounds?: { id: string; label: string; color: string; startDate: string; endDate: string }[];
    bookmarks?: { id: string; type: string; date: string | null; color: string; label: string | null }[];
    infoboxes?: { id: string; title: string | null; body: string; color: string; date: string; rowIndex: number }[];
  };
  let {
    tasks,
    onSelect,
    onMove,
    onCreateAtDate,
    onDepCreate,
    onDepClick,
    criticalPathIds = new Set<string>(),
    baseline = [],
    dependencies = [],
    lookaheadWeeks = 0,
    taskDefectCounts = [],
    floatMap = new Map<string, number>(),
    highlightedTaskId = null,
    multiSelected = new Set<string>(),
    onMultiSelect,
    backgrounds = [],
    bookmarks = [],
    infoboxes = []
  }: Props = $props();

  /* Transitive connected set from highlightedTaskId */
  let connectedIds = $derived.by(() => {
    if (!highlightedTaskId) return new Set<string>();
    const connected = new Set<string>();
    const queue = [highlightedTaskId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (connected.has(id)) continue;
      connected.add(id);
      for (const d of dependencies) {
        if (d.predecessorId === id && !connected.has(d.successorId)) queue.push(d.successorId);
        if (d.successorId === id && !connected.has(d.predecessorId)) queue.push(d.predecessorId);
      }
    }
    return connected;
  });

  /* ===== Verzug-Ampel: task overdue + open defects = red, all resolved = green ===== */
  let defectMap = $derived.by(() => {
    const m = new Map<string, { total: number; open: number }>();
    for (const c of taskDefectCounts) {
      if (c.taskId) m.set(c.taskId, { total: c.total, open: c.open });
    }
    return m;
  });

  function verzugStatus(t: GTask): 'overdue' | 'clear' | 'none' {
    const counts = defectMap.get(t.id);
    if (!counts || counts.total === 0) return 'none';
    const today = fmtDate(new Date());
    if (t.endDate < today && counts.open > 0) return 'overdue';
    if (counts.open === 0) return 'clear';
    return 'none';
  }

  let baselineMap = $derived.by(() => {
    const m = new Map<string, { plannedStart: string; plannedEnd: string }>();
    for (const b of baseline) m.set(b.taskId, { plannedStart: b.plannedStart, plannedEnd: b.plannedEnd });
    return m;
  });

  let zoom = $state<'day' | 'week' | 'month'>('week');
  let collapsed = $state<Record<string, boolean>>({});
  let pinnedIds = $state<Set<string>>(new Set());
  let showColumns = $state<{ start: boolean; end: boolean; duration: boolean; progress: boolean }>({
    start: false, end: false, duration: false, progress: false
  });

  function togglePin(id: string) {
    const next = new Set(pinnedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    pinnedIds = next;
  }

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

  let visible = $derived.by(() => {
    const base = tasks.filter((t) => !isHidden(t));
    if (pinnedIds.size === 0) return base;
    const pinned = base.filter((t) => pinnedIds.has(t.id));
    const rest = base.filter((t) => !pinnedIds.has(t.id));
    return [...pinned, ...rest];
  });

  function offsetPx(date: string): number {
    return daysBetween(range.start, date) * dayWidth();
  }

  function widthFor(t: GTask): number {
    return Math.max(8, (daysBetween(t.startDate, t.endDate) + 1) * dayWidth());
  }

  function nonWorkdays(): { left: number; width: number; holiday: string | null }[] {
    if (zoom === 'month') return []; // too dense to render
    const out: { left: number; width: number; holiday: string | null }[] = [];
    const start = parseDate(range.start);
    const end = parseDate(range.end);
    const cur = new Date(start);
    while (cur <= end) {
      if (isNonWorkdayFull(cur)) {
        const left = daysBetween(range.start, fmtDate(cur)) * dayWidth();
        out.push({ left, width: dayWidth(), holiday: holidayName(cur) });
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

  let projectEndPos = $derived.by(() => {
    if (tasks.length === 0) return null;
    let latest = tasks[0].endDate;
    for (const t of tasks) if (t.endDate > latest) latest = t.endDate;
    if (latest < range.start || latest > range.end) return null;
    return { px: (daysBetween(range.start, latest) + 1) * dayWidth(), date: latest };
  });

  /* ===== Drag-to-move (Pointer Events: Maus + Touch) =====
   *
   * Touch braucht Long-Press (Schwelle 350ms) damit Scroll-Geste nicht
   * übernommen wird. Maus startet sofort.
   */
  type DragMode = 'move' | 'resize-end';
  type DragState = {
    id: string; startDate: string; endDate: string;
    originX: number; previewOffset: number;
    pointerId: number; pointerType: string;
    armed: boolean; // true wenn Long-Press erfüllt (oder Maus)
    moved: boolean; // user bewegt mehr als 4px
    mode: DragMode;
  };
  let dragging = $state<DragState | null>(null);
  let pressTimer: ReturnType<typeof setTimeout> | null = null;

  const TOUCH_LONG_PRESS_MS = 350;
  const MOVE_THRESHOLD_PX = 4;

  const RESIZE_EDGE_PX = 8; // hitzone for resize at bar edges

  function onBarPointerDown(e: PointerEvent, t: GTask) {
    if (!onMove) return;
    if (isParentMap.has(t.id)) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Detect if click is near the right edge of the bar
    const bar = e.currentTarget as HTMLElement;
    const barRect = bar.getBoundingClientRect();
    const distFromRight = barRect.right - e.clientX;
    const mode: DragMode = (distFromRight <= RESIZE_EDGE_PX && e.pointerType === 'mouse') ? 'resize-end' : 'move';

    const initial: DragState = {
      id: t.id,
      startDate: t.startDate,
      endDate: t.endDate,
      originX: e.clientX,
      previewOffset: 0,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      armed: e.pointerType === 'mouse',
      moved: false,
      mode
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
    const mode = dragging.mode;
    const t = { id: dragging.id, startDate: dragging.startDate, endDate: dragging.endDate };
    dragging = null;
    if (!wasArmed || !onMove) return;
    const dxDays = Math.round(offset / dayWidth());
    if (dxDays !== 0) {
      if (mode === 'resize-end') {
        // Only change endDate, keep startDate
        const newEnd = addDays(t.endDate, dxDays);
        if (newEnd >= t.startDate) {
          onMove(t.id, t.startDate, newEnd);
        }
      } else {
        const newStart = addDays(t.startDate, dxDays);
        const newEnd = addDays(t.endDate, dxDays);
        onMove(t.id, newStart, newEnd);
      }
    }
  }

  function onBarPointerCancel(e: PointerEvent) {
    if (!dragging || dragging.pointerId !== e.pointerId) return;
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    dragging = null;
  }

  /* ===== Dependency Drag&Drop (Connector-Handles auf Bars) =====
   *
   * Hover über eine Bar zeigt zwei Handles (Start + End). Drag von einem
   * Handle auf eine andere Bar (oder deren Handle) erzeugt eine Dependency.
   *
   * Mobile: kein Hover-State — stattdessen Long-Press auf einer Bar
   * aktiviert den "Connector-Mode" (depMode = id), und der nächste Tap
   * auf eine andere Bar erzeugt die Dependency.
   */
  let depDrag = $state<null | {
    predecessorId: string;
    predHandle: DepHandle;
    pointerId: number;
    cursorX: number; // relative zur timeline
    cursorY: number;
    startX: number;
    startY: number;
  }>(null);
  let depMode = $state<{ id: string; handle: DepHandle } | null>(null); // Touch-Mode

  function onHandlePointerDown(e: PointerEvent, taskId: string, handle: DepHandle) {
    e.stopPropagation();
    if (!onDepCreate) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const wrap = (e.currentTarget as HTMLElement).closest('.gantt-timeline');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    depDrag = {
      predecessorId: taskId,
      predHandle: handle,
      pointerId: e.pointerId,
      cursorX: e.clientX - rect.left,
      cursorY: e.clientY - rect.top,
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onHandlePointerMove(e: PointerEvent) {
    if (!depDrag || depDrag.pointerId !== e.pointerId) return;
    const wrap = (e.currentTarget as HTMLElement).closest('.gantt-timeline');
    if (!wrap) return;
    const rect = wrap.getBoundingClientRect();
    depDrag = { ...depDrag, cursorX: e.clientX - rect.left, cursorY: e.clientY - rect.top };
  }
  function onHandlePointerUp(e: PointerEvent) {
    if (!depDrag || depDrag.pointerId !== e.pointerId) return;
    // Find target bar at the cursor position
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const targetBar = target?.closest('[data-task-id]') as HTMLElement | null;
    const targetTaskId = targetBar?.dataset.taskId;
    const targetHandleAttr = targetBar?.dataset.handle as DepHandle | undefined;
    if (targetTaskId && targetTaskId !== depDrag.predecessorId) {
      // Default: target's start (FS-style)
      const succHandle: DepHandle = targetHandleAttr ?? 'start';
      onDepCreate?.(depDrag.predecessorId, targetTaskId, depDrag.predHandle, succHandle);
    }
    depDrag = null;
  }

  function activateDepMode(taskId: string, handle: DepHandle) {
    depMode = { id: taskId, handle };
  }
  function applyDepMode(targetTaskId: string) {
    if (!depMode || !onDepCreate) return;
    if (targetTaskId === depMode.id) {
      depMode = null;
      return;
    }
    onDepCreate(depMode.id, targetTaskId, depMode.handle, 'start');
    depMode = null;
  }

  /* ===== Scroll-Sync: Vertikalen Scroll zwischen Liste und Timeline synchronisieren ===== */
  let listEl = $state<HTMLElement | null>(null);
  let timelineEl = $state<HTMLElement | null>(null);
  let syncing = false;

  function syncScroll(source: HTMLElement, target: HTMLElement) {
    if (syncing) return;
    syncing = true;
    target.scrollTop = source.scrollTop;
    requestAnimationFrame(() => { syncing = false; });
  }

  $effect(() => {
    if (!listEl || !timelineEl) return;
    const onListScroll = () => syncScroll(listEl!, timelineEl!);
    const onTimelineScroll = () => syncScroll(timelineEl!, listEl!);
    listEl.addEventListener('scroll', onListScroll, { passive: true });
    timelineEl.addEventListener('scroll', onTimelineScroll, { passive: true });
    return () => {
      listEl?.removeEventListener('scroll', onListScroll);
      timelineEl?.removeEventListener('scroll', onTimelineScroll);
    };
  });

  /* Layout-Lookup: y-Position einer Task in der visible-Liste = row-index * 32 + 16 (Mitte) */
  let visibleIndex = $derived.by(() => {
    const m = new Map<string, number>();
    visible.forEach((t, i) => m.set(t.id, i));
    return m;
  });

  function barEdges(taskId: string): { x1: number; x2: number; y: number } | null {
    const t = tasks.find((x) => x.id === taskId);
    const idx = visibleIndex.get(taskId);
    if (!t || idx === undefined) return null;
    const x1 = offsetPx(t.startDate);
    const isMilestone = t.startDate === t.endDate;
    const x2 = isMilestone
      ? x1 + dayWidth()
      : x1 + Math.max(8, (daysBetween(t.startDate, t.endDate) + 1) * dayWidth());
    const y = idx * 32 + 16; // Mitte der Bar
    return { x1, x2, y };
  }

  /** Pfad-Generator: rechteckige Polylinie zwischen zwei Punkten,
   * ähnlich MS-Project: vom predecessor-Edge nach rechts/links,
   * dann vertikal, dann zur successor-Bar. */
  let diagonalDeps = $state(true); // Default: diagonal (natürlicher)

  function depPath(d: Dependency): string | null {
    const pred = barEdges(d.predecessorId);
    const succ = barEdges(d.successorId);
    if (!pred || !succ) return null;
    const fromX = d.type === 'SS' || d.type === 'SF' ? pred.x1 : pred.x2;
    const toX = d.type === 'FF' || d.type === 'SF' ? succ.x2 : succ.x1;
    if (diagonalDeps) {
      // Schräge Linie mit kurzem horizontalen Stub für saubere Pfeilspitze
      const stub = 6;
      const fromDir = d.type === 'SS' || d.type === 'SF' ? -1 : 1;
      const toDir = d.type === 'FF' || d.type === 'SF' ? 1 : -1;
      return `M ${fromX} ${pred.y} L ${fromX + fromDir * stub} ${pred.y} L ${toX + toDir * stub} ${succ.y} L ${toX} ${succ.y}`;
    }
    const fromDir = d.type === 'SS' || d.type === 'SF' ? -1 : 1;
    const toDir = d.type === 'FF' || d.type === 'SF' ? 1 : -1;
    const stub = 10;
    const elbow1 = fromX + fromDir * stub;
    const elbow2 = toX + toDir * stub;
    return `M ${fromX} ${pred.y} L ${elbow1} ${pred.y} L ${elbow1} ${succ.y} L ${elbow2} ${succ.y} L ${toX} ${succ.y}`;
  }

  function depTipPos(d: Dependency): { x: number; y: number } | null {
    const succ = barEdges(d.successorId);
    if (!succ) return null;
    const tipDir = d.type === 'FF' || d.type === 'SF' ? 1 : -1;
    return { x: succ.x1 + (tipDir < 0 ? 0 : succ.x2 - succ.x1), y: succ.y };
  }
</script>

<div class="gantt-toolbar">
  <div class="gantt-toolbar-group">
    <button class="gantt-zoom-btn" class:active={zoom === 'day'} onclick={() => (zoom = 'day')}>Tag</button>
    <button class="gantt-zoom-btn" class:active={zoom === 'week'} onclick={() => (zoom = 'week')}>Woche</button>
    <button class="gantt-zoom-btn" class:active={zoom === 'month'} onclick={() => (zoom = 'month')}>Monat</button>
  </div>
  <div class="gantt-toolbar-spacer"></div>
  <button class="gantt-zoom-btn" class:active={diagonalDeps} onclick={() => (diagonalDeps = !diagonalDeps)} title="Verknüpfungslinien: orthogonal/diagonal">
    {diagonalDeps ? '╲' : '┘'}
  </button>
  {#if pinnedIds.size > 0}
    <button class="gantt-zoom-btn" onclick={() => (pinnedIds = new Set())}>📌 {pinnedIds.size} entpinnen</button>
  {/if}
  <details class="gantt-col-dropdown">
    <summary class="gantt-zoom-btn">Spalten</summary>
    <div class="gantt-col-panel">
      <label><input type="checkbox" bind:checked={showColumns.start} /> Start</label>
      <label><input type="checkbox" bind:checked={showColumns.end} /> Ende</label>
      <label><input type="checkbox" bind:checked={showColumns.duration} /> Dauer</label>
      <label><input type="checkbox" bind:checked={showColumns.progress} /> Fortschritt</label>
    </div>
  </details>
  <span class="gantt-info"><b>{tasks.length}</b> Termine</span>
</div>

<div class="gantt-wrap">
  <div class="gantt-list" bind:this={listEl}>
    <div class="gantt-list-head">
      <span style="flex:1">Vorgang</span>
      {#if showColumns.start}<span class="col-extra">Start</span>{/if}
      {#if showColumns.end}<span class="col-extra">Ende</span>{/if}
      {#if showColumns.duration}<span class="col-extra">AT</span>{/if}
      {#if showColumns.progress}<span class="col-extra">%</span>{/if}
    </div>
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
        {:else if t.startDate === t.endDate}
          <span class="gantt-list-toggle milestone" style={`color:${t.color ?? 'var(--red)'}`}>◆</span>
        {:else}
          <span class="gantt-list-toggle empty"></span>
        {/if}
        <span class="gantt-list-num">{t.num ?? ''}</span>
        <span class="gantt-list-name">{t.name}</span>
        <span class="gantt-pin-btn" class:pinned={pinnedIds.has(t.id)} onclick={(e) => { e.stopPropagation(); togglePin(t.id); }} onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); togglePin(t.id); } }} role="button" tabindex="-1" aria-label={pinnedIds.has(t.id) ? 'Entpinnen' : 'Pinnen'}>
          {pinnedIds.has(t.id) ? '📌' : ''}
        </span>
        {#if !isParentMap.has(t.id) && t.startDate !== t.endDate && t.endDate < fmtDate(new Date()) && (t.progressPct ?? 0) < 100}
          <span class="gantt-status-dot red"></span>
        {:else if !isParentMap.has(t.id) && (t.progressPct ?? 0) >= 100}
          <span class="gantt-status-dot green"></span>
        {/if}
        {#if showColumns.start}<span class="col-extra-val">{t.startDate.slice(5)}</span>{/if}
        {#if showColumns.end}<span class="col-extra-val">{t.endDate.slice(5)}</span>{/if}
        {#if showColumns.duration}<span class="col-extra-val">{t.durationAt ?? daysBetween(t.startDate, t.endDate)}</span>{/if}
        {#if showColumns.progress}<span class="col-extra-val">{t.progressPct ?? 0}</span>{/if}
      </button>
    {/each}
  </div>

  <div class="gantt-timeline-wrap" bind:this={timelineEl}>
    <div class="gantt-timeline" style={`width:${widthPx}px`}>
      <div class="gantt-axis">
        {#each months() as m}
          <div class="gantt-axis-month" style={`left:${m.left}px;width:${m.width}px`}>{m.label}</div>
        {/each}
      </div>
      {#each nonWorkdays() as w}
        <div class="gantt-weekend" class:holiday={!!w.holiday} style={`left:${w.left}px;width:${w.width}px`} title={w.holiday ?? ''}></div>
      {/each}
      {#each backgrounds as bg (bg.id)}
        {@const left = offsetPx(bg.startDate)}
        {@const width = Math.max(dayWidth(), (daysBetween(bg.startDate, bg.endDate) + 1) * dayWidth())}
        <div class="gantt-bg-region" style={`left:${left}px;width:${width}px;background:${bg.color}20`}>
          <span class="gantt-bg-label" style={`color:${bg.color}`}>{bg.label}</span>
        </div>
      {/each}
      {#if todayPos() !== null}
        <div class="gantt-today-line" style={`left:${todayPos()}px`}>
          <span class="gantt-today-pulse"></span>
          <span class="gantt-today-label">Heute</span>
        </div>
      {/if}
      {#each bookmarks.filter(b => b.type === 'date' && b.date) as bm (bm.id)}
        {@const bmLeft = daysBetween(range.start, bm.date!) * dayWidth()}
        <div class="gantt-bookmark-line" style={`left:${bmLeft}px;border-color:${bm.color}`}>
          {#if bm.label}<span class="gantt-bookmark-label" style={`background:${bm.color}`}>{bm.label}</span>{/if}
        </div>
      {/each}
      {#if projectEndPos}
        <div class="gantt-project-end-line" style={`left:${projectEndPos.px}px`}>
          <span class="gantt-project-end-label">Projektende</span>
        </div>
      {/if}
      <div class="gantt-rows" ondblclick={(e) => {
        if (!onCreateAtDate) return;
        // Only fire if double-click was on empty area (not on a bar)
        const target = e.target as HTMLElement;
        if (target.closest('.gantt-bar') || target.closest('.gantt-milestone')) return;
        const timeline = (e.currentTarget as HTMLElement).closest('.gantt-timeline');
        if (!timeline) return;
        const rect = timeline.getBoundingClientRect();
        const xInTimeline = e.clientX - rect.left + (timeline.parentElement?.scrollLeft ?? 0);
        const dayIndex = Math.floor(xInTimeline / dayWidth());
        const clickDate = addDays(range.start, dayIndex);
        onCreateAtDate(clickDate);
      }}>
        {#each visible as t (t.id)}
          {@const bl = baselineMap.get(t.id)}
          <div class="gantt-row depth-{t.depth}">
            {#if bl && !isParentMap.has(t.id)}
              <div
                class="gantt-baseline-bar"
                title={`Soll: ${bl.plannedStart} → ${bl.plannedEnd}`}
                style={`left:${offsetPx(bl.plannedStart)}px;width:${Math.max(8, (daysBetween(bl.plannedStart, bl.plannedEnd) + 1) * dayWidth())}px`}
              >
                <span class="gantt-baseline-label">Soll</span>
              </div>
            {/if}
            {#if dragging?.id === t.id && dragging.armed && dragging.moved}
              <div
                class="gantt-ghost"
                style={`left:${offsetPx(t.startDate)}px;width:${widthFor(t)}px;background:${t.color ?? '#3B6CC4'}`}
              ></div>
            {/if}
            {#if isParentMap.has(t.id)}
              <div class="gantt-bar summary" style={`left:${offsetPx(t.startDate)}px;width:${widthFor(t)}px`}></div>
            {:else if t.startDate === t.endDate}
              {@const vs = verzugStatus(t)}
              <button
                class="gantt-milestone"
                class:critical={criticalPathIds.has(t.id)}
                class:dimmed={(criticalPathIds.size > 0 && !criticalPathIds.has(t.id)) || (connectedIds.size > 0 && !connectedIds.has(t.id))}
                class:dragging={dragging?.id === t.id && dragging.armed}
                class:dep-mode-target={depMode && depMode.id !== t.id}
                style={`left:${offsetPx(t.startDate) + (dragging?.id === t.id && dragging.armed ? dragging.previewOffset : 0)}px;--ms-color:${vs === 'overdue' ? '#C62828' : vs === 'clear' ? '#2E7D32' : (t.color ?? '#E30613')}`}
                onclick={() => {
                  if (depMode) { applyDepMode(t.id); return; }
                  if (!dragging || !dragging.moved) onSelect?.(t.id);
                }}
                onpointerdown={(e) => onBarPointerDown(e, t)}
                onpointermove={onBarPointerMove}
                onpointerup={onBarPointerUp}
                onpointercancel={onBarPointerCancel}
                data-task-id={t.id}
              >
                <span class="gantt-milestone-diamond"></span>
                <span class="gantt-bar-tooltip" role="tooltip">
                  <span class="tooltip-name">◆ {t.name}</span>
                  <span class="tooltip-meta">Meilenstein: {t.startDate}</span>
                  {#if defectMap.has(t.id)}
                    {@const dc = defectMap.get(t.id)}
                    <span class="tooltip-defects" class:overdue={vs === 'overdue'} class:clear={vs === 'clear'}>
                      {dc?.open ?? 0} offene Mängel / {dc?.total ?? 0} gesamt
                    </span>
                  {/if}
                </span>
                {#if onDepCreate}
                  <span
                    class="gantt-dep-handle gantt-dep-handle-start"
                    role="button"
                    aria-label="Dependency vom Anfang ziehen"
                    data-task-id={t.id}
                    data-handle="start"
                    onpointerdown={(e) => onHandlePointerDown(e, t.id, 'start')}
                    onpointermove={onHandlePointerMove}
                    onpointerup={onHandlePointerUp}
                  ></span>
                  <span
                    class="gantt-dep-handle gantt-dep-handle-end"
                    role="button"
                    aria-label="Dependency vom Ende ziehen"
                    data-task-id={t.id}
                    data-handle="end"
                    onpointerdown={(e) => onHandlePointerDown(e, t.id, 'end')}
                    onpointermove={onHandlePointerMove}
                    onpointerup={onHandlePointerUp}
                  ></span>
                {/if}
              </button>
            {:else}
              {@const vs = verzugStatus(t)}
              <button
                class="gantt-bar"
                class:critical={criticalPathIds.has(t.id)}
                class:dimmed={(criticalPathIds.size > 0 && !criticalPathIds.has(t.id)) || (connectedIds.size > 0 && !connectedIds.has(t.id))}
                class:dragging={dragging?.id === t.id && dragging.armed}
                class:armed-touch={dragging?.id === t.id && dragging.armed && dragging.pointerType !== 'mouse'}
                class:dep-mode-target={depMode && depMode.id !== t.id}
                class:verzug-overdue={vs === 'overdue'}
                class:verzug-clear={vs === 'clear'}
                style={`left:${offsetPx(t.startDate) + (dragging?.id === t.id && dragging.armed && dragging.mode === 'move' ? dragging.previewOffset : 0)}px;width:${widthFor(t) + (dragging?.id === t.id && dragging.armed && dragging.mode === 'resize-end' ? dragging.previewOffset : 0)}px;background:${vs === 'overdue' ? '#C62828' : vs === 'clear' ? '#2E7D32' : (t.color ?? '#3B6CC4')}`}
                onclick={(e) => {
                  if (depMode) { applyDepMode(t.id); return; }
                  if (dragging?.moved) return;
                  if (e.shiftKey && onMultiSelect) {
                    const next = new Set(multiSelected);
                    if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
                    onMultiSelect(next);
                    return;
                  }
                  onSelect?.(t.id);
                }}
                class:multi-selected={multiSelected.has(t.id)}
                onpointerdown={(e) => onBarPointerDown(e, t)}
                onpointermove={onBarPointerMove}
                onpointerup={onBarPointerUp}
                onpointercancel={onBarPointerCancel}
                data-task-id={t.id}
              >
                {#if (t.progressPct ?? 0) > 0}
                  <span class="gantt-bar-progress" style={`width:${Math.min(100, t.progressPct ?? 0)}%`}></span>
                {/if}
                {#if t.segments && t.segments.length >= 2}
                  {#each t.segments.slice(0, -1) as seg, i}
                    {@const gapStart = offsetPx(seg.end) - offsetPx(t.startDate) + dayWidth()}
                    {@const nextSegStart = t.segments[i + 1] ? offsetPx(t.segments[i + 1].start) - offsetPx(t.startDate) : 0}
                    {@const gapWidth = nextSegStart - gapStart}
                    {#if gapWidth > 0}
                      <span class="gantt-segment-gap" style={`left:${gapStart}px;width:${gapWidth}px`}></span>
                    {/if}
                  {/each}
                {/if}
                <span class="gantt-bar-label">{t.name}</span>
                <span class="gantt-bar-tooltip" role="tooltip">
                  <span class="tooltip-name">{t.name}</span>
                  <span class="tooltip-meta">{t.startDate} → {t.endDate}</span>
                  {#if (t.progressPct ?? 0) > 0}
                    <span class="tooltip-meta">Fortschritt: {t.progressPct}%</span>
                  {/if}
                  {#if defectMap.has(t.id)}
                    {@const dc = defectMap.get(t.id)}
                    <span class="tooltip-defects" class:overdue={vs === 'overdue'} class:clear={vs === 'clear'}>
                      {dc?.open ?? 0} offene Mängel / {dc?.total ?? 0} gesamt
                      {#if vs === 'overdue'} — Verzug!{/if}
                      {#if vs === 'clear'} — alle erledigt{/if}
                    </span>
                  {/if}
                  {#if floatMap.has(t.id)}
                    {@const float = floatMap.get(t.id) ?? 0}
                    <span class="tooltip-meta tooltip-float" class:zero={float === 0}>
                      Puffer: {float} AT{float === 0 ? ' (kritisch)' : ''}
                    </span>
                  {/if}
                  {#if criticalPathIds.has(t.id)}
                    <span class="tooltip-crit">Kritisch — Verzögerung wirkt 1:1 auf Übergabe</span>
                  {/if}
                </span>
                {#if floatMap.has(t.id) && (floatMap.get(t.id) ?? 0) > 0}
                  <span
                    class="gantt-float-line"
                    style={`left:${widthFor(t)}px;width:${(floatMap.get(t.id) ?? 0) * dayWidth()}px`}
                  ></span>
                {/if}
                {#if onDepCreate}
                  <span
                    class="gantt-dep-handle gantt-dep-handle-start"
                    role="button"
                    aria-label="Dependency vom Anfang ziehen"
                    data-task-id={t.id}
                    data-handle="start"
                    onpointerdown={(e) => onHandlePointerDown(e, t.id, 'start')}
                    onpointermove={onHandlePointerMove}
                    onpointerup={onHandlePointerUp}
                    oncontextmenu={(e) => { e.preventDefault(); activateDepMode(t.id, 'start'); }}
                  ></span>
                  <span
                    class="gantt-dep-handle gantt-dep-handle-end"
                    role="button"
                    aria-label="Dependency vom Ende ziehen"
                    data-task-id={t.id}
                    data-handle="end"
                    onpointerdown={(e) => onHandlePointerDown(e, t.id, 'end')}
                    onpointermove={onHandlePointerMove}
                    onpointerup={onHandlePointerUp}
                    oncontextmenu={(e) => { e.preventDefault(); activateDepMode(t.id, 'end'); }}
                  ></span>
                {/if}
              </button>
            {/if}
          </div>
        {/each}
      </div>

      {#each infoboxes as ib (ib.id)}
        <div class="gantt-infobox" style={`left:${offsetPx(ib.date)}px;top:${60 + ib.rowIndex * 32}px;background:${ib.color}`}>
          {#if ib.title}<div class="gantt-infobox-title">{ib.title}</div>{/if}
          <div class="gantt-infobox-body">{ib.body}</div>
        </div>
      {/each}

      {#if dependencies.length > 0 || depDrag}
        <svg class="gantt-deps" width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <marker id="gantt-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(15,15,16,0.55)"></path>
            </marker>
            <marker id="gantt-arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--red)"></path>
            </marker>
          </defs>
          {#each dependencies as d (d.id)}
            {@const path = depPath(d)}
            {#if path}
              <path
                class="gantt-dep-arrow"
                d={path}
                marker-end="url(#gantt-arrow)"
                onclick={() => onDepClick?.(d.id)}
                role="button"
                aria-label={`Dependency ${d.type}${d.lagDays ? ' Lag ' + d.lagDays : ''}`}
              ></path>
            {/if}
          {/each}
          {#if depDrag}
            <line
              class="gantt-dep-drag"
              x1={depDrag.startX}
              y1={depDrag.startY}
              x2={depDrag.cursorX}
              y2={depDrag.cursorY}
              marker-end="url(#gantt-arrow-active)"
            ></line>
          {/if}
        </svg>
      {/if}
    </div>
  </div>
</div>

{#if depMode}
  <div class="dep-mode-banner" role="status">
    <span>Tippe auf eine Bar zum Verbinden</span>
    <button class="btn btn-ghost btn-sm" onclick={() => (depMode = null)}>Abbrechen</button>
  </div>
{/if}

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
    flex-shrink: 0; width: 300px; min-width: 200px;
    border-right: 1px solid var(--line-strong);
    background: var(--paper);
    overflow-y: auto; overflow-x: hidden; scrollbar-width: none;
  }
  .gantt-list::-webkit-scrollbar { display: none; }
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
    background: var(--paper-tint); border-bottom: 2px solid var(--line-strong);
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
  .gantt-list-toggle.milestone { visibility: visible; font-size: 11px; }
  .gantt-list-num {
    font-family: var(--mono); font-size: 10px;
    color: var(--muted); font-weight: 700;
    flex-shrink: 0; min-width: 38px; letter-spacing: -.02em;
  }
  .gantt-list-name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .col-extra { font-family: var(--mono); font-size: 9px; width: 48px; text-align: right; flex-shrink: 0; }
  .col-extra-val { font-family: var(--mono); font-size: 10px; width: 48px; text-align: right; flex-shrink: 0; color: var(--muted); }
  .gantt-col-dropdown { position: relative; }
  .gantt-col-dropdown summary { list-style: none; cursor: pointer; }
  .gantt-col-dropdown summary::-webkit-details-marker { display: none; }
  .gantt-col-panel { position: absolute; top: calc(100% + 4px); right: 0; z-index: 25; background: var(--paper); border: 1px solid var(--line-strong); border-radius: var(--r-md); box-shadow: var(--shadow-2); padding: 8px; display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
  .gantt-col-panel label { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
  .gantt-pin-btn { width: 18px; height: 18px; flex-shrink: 0; font-size: 10px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; opacity: 0; transition: opacity .12s; padding: 0; }
  .gantt-row-list:hover .gantt-pin-btn { opacity: 0.4; }
  .gantt-pin-btn.pinned { opacity: 1; }
  .gantt-pin-btn:hover { opacity: 1; }
  .gantt-status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: transparent; margin-left: 4px; }
  .gantt-status-dot.red { background: var(--red); }
  .gantt-status-dot.green { background: var(--green); }
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
  .gantt-bg-region {
    position: absolute; top: 60px; bottom: 0;
    pointer-events: none; z-index: 0;
    border-left: 2px solid currentColor;
    border-right: 2px solid currentColor;
    opacity: 0.6;
  }
  .gantt-bg-label {
    position: absolute; top: 2px; left: 4px;
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .04em;
    white-space: nowrap; pointer-events: none;
  }
  .gantt-weekend.holiday {
    background: repeating-linear-gradient(
      135deg,
      rgba(227, 6, 19, 0.04) 0,
      rgba(227, 6, 19, 0.04) 4px,
      rgba(227, 6, 19, 0.08) 4px,
      rgba(227, 6, 19, 0.08) 8px
    );
  }
  .gantt-today-line {
    position: absolute; top: 30px; bottom: 0; width: 2px;
    background: var(--red); z-index: 8; pointer-events: none;
    box-shadow: 0 0 0 1px rgba(227, 6, 19, .2);
  }
  .gantt-bookmark-line {
    position: absolute; top: 30px; bottom: 0; width: 0;
    border-left: 2px solid; z-index: 7; pointer-events: none;
  }
  .gantt-bookmark-label {
    position: absolute; left: -1px; top: 0;
    color: #fff; font-family: var(--mono); font-size: 9px; font-weight: 700;
    padding: 1px 5px; border-radius: 0 4px 4px 0;
    text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
  }
  .gantt-project-end-line {
    position: absolute; top: 30px; bottom: 0; width: 2px;
    background: var(--ink-2); z-index: 7; pointer-events: none;
    border-left: 2px dashed var(--ink-2);
    opacity: 0.6;
  }
  .gantt-project-end-label {
    position: absolute; left: -22px; top: 0;
    background: var(--ink-2); color: #fff;
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: .04em;
    white-space: nowrap;
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
  .gantt-row.depth-0 { background: var(--paper-tint); border-bottom: 2px solid var(--line-strong); }
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
  .gantt-bar-progress {
    position: absolute; left: 0; bottom: 0; top: 0;
    background: rgba(0, 0, 0, 0.22);
    border-radius: 4px 0 0 4px;
    pointer-events: none;
  }
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
  .gantt-bar.dep-mode-target { box-shadow: 0 0 0 2px var(--red); animation: depPulse 1.4s ease-in-out infinite; }
  @keyframes depPulse {
    0%   { box-shadow: 0 0 0 2px var(--red); }
    50%  { box-shadow: 0 0 0 5px rgba(227, 6, 19, 0.35); }
    100% { box-shadow: 0 0 0 2px var(--red); }
  }
  @media (prefers-reduced-motion: reduce) { .gantt-bar.dep-mode-target { animation: none; } }
  .gantt-bar { touch-action: pan-y; position: relative; }
  .gantt-dep-handle {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 12px; height: 12px;
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid var(--ink-2);
    border-radius: 50%;
    cursor: crosshair;
    opacity: 0;
    transition: opacity var(--d-fast, 180ms) ease;
    z-index: 11;
  }
  .gantt-bar:hover .gantt-dep-handle, .gantt-dep-handle:focus-visible { opacity: 1; }
  .gantt-dep-handle:hover { background: var(--red); border-color: var(--red); }
  .gantt-dep-handle-start { left: -8px; }
  .gantt-dep-handle-end { right: -8px; }
  @media (hover: none) {
    /* Touch: Handles immer schwach sichtbar — Long-press wäre verwirrend */
    .gantt-dep-handle { opacity: 0.55; }
  }
  .gantt-deps {
    position: absolute; left: 0; top: 60px; right: 0; bottom: 0;
    pointer-events: none; z-index: 5;
  }
  .gantt-dep-arrow {
    fill: none;
    stroke: rgba(15, 15, 16, 0.6);
    stroke-width: 1.8;
    pointer-events: stroke;
    cursor: pointer;
    transition: stroke var(--d-fast, 180ms) ease, stroke-width var(--d-fast, 180ms) ease;
  }
  .gantt-dep-arrow:hover {
    stroke: var(--red);
    stroke-width: 2.2;
  }
  .gantt-dep-drag {
    stroke: var(--red);
    stroke-width: 2.5;
    stroke-dasharray: 6 4;
    pointer-events: none;
  }
  .dep-mode-banner {
    position: fixed; bottom: calc(80px + env(safe-area-inset-bottom)); left: 50%;
    transform: translateX(-50%);
    background: var(--ink); color: #fff;
    padding: 10px 16px; border-radius: 999px;
    box-shadow: var(--shadow-2);
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; font-weight: 600;
    z-index: 60;
  }
  .dep-mode-banner .btn { color: #fff; }
  .gantt-baseline-bar {
    position: absolute; top: 2px; height: 6px;
    background: rgba(15, 15, 16, 0.15);
    border-radius: 3px;
    pointer-events: none;
    z-index: 1;
  }
  .gantt-baseline-label {
    position: absolute; left: 2px; top: -1px;
    font-family: var(--mono); font-size: 7px; font-weight: 700;
    color: rgba(15, 15, 16, 0.35); text-transform: uppercase;
    letter-spacing: .04em; pointer-events: none;
  }
  .gantt-bar.verzug-overdue {
    box-shadow: 0 0 0 2px #C62828, 0 2px 6px rgba(198, 40, 40, .35);
    animation: verzugPulse 2s ease-in-out infinite;
  }
  .gantt-bar.verzug-clear {
    box-shadow: 0 0 0 1px #2E7D32;
  }
  @keyframes verzugPulse {
    0%   { box-shadow: 0 0 0 2px #C62828, 0 2px 6px rgba(198, 40, 40, .35); }
    50%  { box-shadow: 0 0 0 4px rgba(198, 40, 40, .5), 0 2px 10px rgba(198, 40, 40, .5); }
    100% { box-shadow: 0 0 0 2px #C62828, 0 2px 6px rgba(198, 40, 40, .35); }
  }
  @media (prefers-reduced-motion: reduce) { .gantt-bar.verzug-overdue { animation: none; } }
  .tooltip-defects {
    display: block;
    margin-top: 4px;
    padding: 3px 6px;
    background: rgba(255, 255, 255, .15);
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .02em;
  }
  .tooltip-float { color: rgba(255, 255, 255, .7); }
  .tooltip-float.zero { color: var(--red); font-weight: 700; }
  .gantt-float-line {
    position: absolute; top: 14px; height: 2px;
    border-top: 2px dashed rgba(15, 15, 16, .2);
    pointer-events: none; z-index: 2;
  }
  .tooltip-defects.overdue { background: #C62828; color: #fff; }
  .tooltip-defects.clear { background: #2E7D32; color: #fff; }
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
  .gantt-bar { cursor: grab; overflow: visible; }
  .gantt-bar::after {
    content: '';
    position: absolute; right: 0; top: 0; bottom: 0; width: 8px;
    cursor: ew-resize; z-index: 2;
  }
  .gantt-bar.multi-selected { box-shadow: 0 0 0 2px var(--blue, #3B6CC4), 0 2px 6px rgba(59, 108, 196, .3); }
  .gantt-bar.dragging { cursor: grabbing; }
  .gantt-bar-label {
    display: block; position: relative; z-index: 1;
    white-space: nowrap; pointer-events: none;
  }
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
  .gantt-infobox {
    position: absolute; z-index: 10;
    min-width: 80px; max-width: 200px;
    padding: 4px 8px; border-radius: 6px;
    border: 1px solid rgba(0, 0, 0, .1);
    box-shadow: 0 1px 4px rgba(0, 0, 0, .08);
    font-size: 11px; pointer-events: auto;
  }
  .gantt-infobox-title { font-weight: 700; font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: .03em; margin-bottom: 2px; }
  .gantt-infobox-body { line-height: 1.3; white-space: pre-wrap; word-break: break-word; }
  .gantt-segment-gap {
    position: absolute; top: 0; bottom: 0;
    background: var(--paper); z-index: 1;
    border-left: 1px dashed rgba(15, 15, 16, .2);
    border-right: 1px dashed rgba(15, 15, 16, .2);
  }
  .gantt-ghost {
    position: absolute; top: 6px; height: 20px;
    border-radius: 4px; opacity: 0.2;
    pointer-events: none; z-index: 1;
    border: 2px dashed rgba(15, 15, 16, .3);
    background: transparent !important;
  }
  .gantt-bar.summary {
    height: 8px; top: 12px; border-radius: 2px;
    background: linear-gradient(180deg, var(--ink) 0%, var(--ink-2) 100%);
    font-size: 0; pointer-events: none;
  }
  /* Milestone */
  .gantt-milestone {
    position: absolute; top: 4px; height: 24px; width: 24px;
    transform: translateX(-4px);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    border: none; background: transparent; padding: 0;
    z-index: 4;
  }
  .gantt-milestone:hover { z-index: 6; }
  .gantt-milestone-diamond {
    width: 14px; height: 14px;
    background: var(--ms-color, var(--red));
    transform: rotate(45deg);
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
    transition: transform .12s, box-shadow .12s;
  }
  .gantt-milestone:hover .gantt-milestone-diamond {
    transform: rotate(45deg) scale(1.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, .3);
  }
  .gantt-milestone.critical .gantt-milestone-diamond {
    box-shadow: 0 0 0 2px var(--red), 0 1px 3px rgba(0, 0, 0, .2);
  }
  .gantt-milestone.dimmed { opacity: 0.32; }
  .gantt-milestone.dragging { opacity: .7; }
  .gantt-milestone .gantt-bar-tooltip {
    position: absolute; bottom: calc(100% + 6px); left: 50%;
    transform: translateX(-50%) scale(0.9);
    background: var(--glass-dark);
    -webkit-backdrop-filter: var(--blur-std);
    backdrop-filter: var(--blur-std);
    color: #fff;
    padding: 6px 10px; border-radius: 8px;
    box-shadow: var(--shadow-2);
    pointer-events: none; opacity: 0;
    transition: opacity var(--d-fast) var(--ease-out-expo), transform var(--d-fast) var(--ease-out-expo);
    z-index: 30; white-space: nowrap;
    display: flex; flex-direction: column; gap: 2px;
  }
  .gantt-milestone:hover .gantt-bar-tooltip { opacity: 1; transform: translateX(-50%) scale(1); }
  .gantt-milestone .gantt-dep-handle { position: absolute; top: 50%; transform: translateY(-50%); }
  .gantt-milestone .gantt-dep-handle-start { left: -12px; }
  .gantt-milestone .gantt-dep-handle-end { right: -12px; }

  /* Print/PDF */
  @media print {
    .gantt-toolbar { display: none !important; }
    .gantt-wrap { height: auto !important; min-height: auto !important; overflow: visible !important; }
    .gantt-list { overflow: visible !important; height: auto !important; }
    .gantt-timeline-wrap { overflow: visible !important; height: auto !important; }
    .gantt-bar-tooltip { display: none !important; }
    .gantt-dep-handle { display: none !important; }
    .gantt-pin-btn { display: none !important; }
    .gantt-today-pulse { display: none !important; }
    .dep-mode-banner { display: none !important; }
  }
</style>
