<script lang="ts">
  /** Cmd+K / Ctrl+K command-palette + global keyboard shortcuts. */
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import Icon, { type IconName } from './Icon.svelte';
  import { page } from '$app/state';
  import { fly } from 'svelte/transition';
  import { ease } from '$lib/motion';

  let open = $state(false);
  let query = $state('');
  let activeIdx = $state(0);
  let inputEl: HTMLInputElement | null = $state(null);

  type Cmd = {
    id: string;
    label: string;
    shortcut?: string;
    icon: IconName;
    action: () => void;
    section?: string;
  };

  function projectId(): string | null {
    const m = page.url.pathname.match(/^\/([0-9a-f-]{36})/);
    return m ? m[1] : null;
  }

  let commands = $derived.by<Cmd[]>(() => {
    const pid = projectId();
    const out: Cmd[] = [];
    if (pid) {
      out.push(
        { id: 'nav-dashboard', label: 'Übersicht', icon: 'home', shortcut: 'g d', action: () => goto(`/${pid}/dashboard`), section: 'Navigation' },
        { id: 'nav-checklisten', label: 'Checklisten', icon: 'list', shortcut: 'g c', action: () => goto(`/${pid}/checklisten`), section: 'Navigation' },
        { id: 'nav-bauzeit', label: 'Bauzeitenplan', icon: 'gantt', shortcut: 'g b', action: () => goto(`/${pid}/bauzeitenplan`), section: 'Navigation' },
        { id: 'nav-aufgaben', label: 'Aufgaben', icon: 'tasks', shortcut: 'g a', action: () => goto(`/${pid}/aufgaben`), section: 'Navigation' },
        { id: 'nav-maengel', label: 'Mängel', icon: 'defect', shortcut: 'g m', action: () => goto(`/${pid}/maengel`), section: 'Navigation' },
        { id: 'nav-plaene', label: 'Pläne', icon: 'file', action: () => goto(`/${pid}/maengel/plaene`), section: 'Navigation' },
        { id: 'nav-kontakte', label: 'Kontakte', icon: 'phone', shortcut: 'g k', action: () => goto(`/${pid}/kontakte`), section: 'Navigation' },
        { id: 'nav-musterdetails', label: 'Musterdetails', icon: 'apartment', action: () => goto(`/${pid}/musterdetails`), section: 'Navigation' },
        { id: 'nav-gewerk-checks', label: 'Gewerk-Checklisten', icon: 'check', action: () => goto(`/${pid}/gewerk-checklisten`), section: 'Navigation' },
        { id: 'nav-aktivitaet', label: 'Aktivität', icon: 'activity', action: () => goto(`/${pid}/aktivitaet`), section: 'Navigation' },
        { id: 'create-mangel', label: 'Neuer Mangel', icon: 'plus', shortcut: 'n', action: () => goto(`/${pid}/maengel?new=1`), section: 'Aktionen' }
      );
    }
    out.push(
      { id: 'nav-projects', label: 'Projekt wechseln', icon: 'building', action: () => goto(`/projects`), section: 'Allgemein' },
      { id: 'shortcuts-help', label: 'Tastenkürzel anzeigen', icon: 'gear', shortcut: '?', action: () => goto(`/shortcuts`), section: 'Allgemein' }
    );
    return out;
  });

  let filtered = $derived.by<Cmd[]>(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  });

  function handleSelect(idx: number) {
    const c = filtered[idx];
    if (!c) return;
    open = false;
    query = '';
    setTimeout(() => c.action(), 30);
  }

  let chord = '';
  let chordTimer: ReturnType<typeof setTimeout> | null = null;

  function clearChord() {
    chord = '';
    if (chordTimer) clearTimeout(chordTimer);
  }

  function handleGlobalKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    const inField = target?.matches('input, textarea, [contenteditable="true"]');

    // Cmd+K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open = !open;
      query = '';
      activeIdx = 0;
      setTimeout(() => inputEl?.focus(), 50);
      return;
    }

    if (open) {
      if (e.key === 'Escape') { open = false; return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(filtered.length - 1, activeIdx + 1); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); return; }
      if (e.key === 'Enter') { e.preventDefault(); handleSelect(activeIdx); return; }
    }

    if (inField) return;

    // Single-key shortcuts
    if (e.key === '/' || e.key === '?') {
      e.preventDefault();
      open = true;
      setTimeout(() => inputEl?.focus(), 50);
      return;
    }

    if (e.key === 'n') {
      e.preventDefault();
      const pid = projectId();
      if (pid) goto(`/${pid}/maengel?new=1`);
      return;
    }

    // Chord 'g <x>'
    if (chord === 'g') {
      const pid = projectId();
      if (!pid) { clearChord(); return; }
      const map: Record<string, string> = { d: 'dashboard', c: 'checklisten', b: 'bauzeitenplan', a: 'aufgaben', m: 'maengel', k: 'kontakte' };
      const dest = map[e.key];
      if (dest) {
        e.preventDefault();
        goto(`/${pid}/${dest}`);
      }
      clearChord();
      return;
    }
    if (e.key === 'g') {
      chord = 'g';
      chordTimer = setTimeout(clearChord, 1200);
      return;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  });

  // Reset active index when filter changes
  $effect(() => {
    void filtered;
    activeIdx = 0;
  });
</script>

{#if open}
  <button class="cmdk-scrim" onclick={() => (open = false)} aria-label="Schließen"></button>
  <div class="cmdk-panel" role="dialog" aria-label="Befehlspalette" in:fly|local={{ y: -8, duration: 180, easing: ease.outExpo }}>
    <div class="cmdk-input-wrap">
      <Icon name="list" size={14} />
      <input
        bind:this={inputEl}
        bind:value={query}
        class="cmdk-input"
        placeholder="Was möchtest du tun?"
        autocomplete="off"
        spellcheck="false"
      />
      <span class="cmdk-hint">ESC</span>
    </div>
    <ul class="cmdk-list" role="listbox">
      {#each filtered as c, i (c.id)}
        <li>
          <button
            class="cmdk-item"
            class:active={i === activeIdx}
            onclick={() => handleSelect(i)}
            onmouseenter={() => (activeIdx = i)}
          >
            <Icon name={c.icon} size={14} />
            <span class="cmdk-label">{c.label}</span>
            {#if c.section}<span class="cmdk-section">{c.section}</span>{/if}
            {#if c.shortcut}<span class="cmdk-shortcut">{c.shortcut}</span>{/if}
          </button>
        </li>
      {/each}
      {#if filtered.length === 0}
        <li class="cmdk-empty">Keine Treffer.</li>
      {/if}
    </ul>
  </div>
{/if}

<style>
  .cmdk-scrim {
    position: fixed; inset: 0; z-index: 400;
    background: rgba(15, 15, 16, 0.42);
    -webkit-backdrop-filter: blur(4px);
    backdrop-filter: blur(4px);
    border: none; cursor: pointer;
  }
  .cmdk-panel {
    position: fixed; top: 12vh; left: 50%; transform: translateX(-50%);
    width: min(560px, calc(100vw - 32px));
    background: var(--glass-frost);
    -webkit-backdrop-filter: var(--blur-strong);
    backdrop-filter: var(--blur-strong);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-3);
    z-index: 401; overflow: hidden;
  }
  @supports not (backdrop-filter: blur(1px)) {
    .cmdk-panel { background: var(--paper); }
  }
  .cmdk-input-wrap { display: flex; align-items: center; gap: 10px; padding: 14px 18px; border-bottom: 1px solid var(--line); }
  .cmdk-input { flex: 1; font-size: 16px; background: transparent; border: none; outline: none; }
  .cmdk-hint { font-family: var(--mono); font-size: 10px; color: var(--muted); border: 1px solid var(--line); padding: 2px 6px; border-radius: 4px; }
  .cmdk-list { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow-y: auto; }
  .cmdk-item {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 9px 12px;
    text-align: left; cursor: pointer; border-radius: 8px;
    font-family: inherit; font-size: 14px;
  }
  .cmdk-item.active, .cmdk-item:hover { background: var(--paper-tint); }
  .cmdk-item.active { background: var(--red-soft); color: var(--red); }
  .cmdk-label { flex: 1; }
  .cmdk-section { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .cmdk-shortcut { font-family: var(--mono); font-size: 10px; color: var(--muted); border: 1px solid var(--line); padding: 1px 5px; border-radius: 4px; }
  .cmdk-empty { padding: 16px; text-align: center; color: var(--muted); font-size: 13px; }
</style>
