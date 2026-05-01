<script lang="ts">
  import Icon from './Icon.svelte';
  import type { StructureHouse } from '$lib/db/structureQueries';

  type SelectionKind = 'project' | 'house' | 'apartment' | 'room';
  export type StructureSelection = {
    kind: SelectionKind;
    houseId: string | null;
    apartmentId: string | null;
    roomId: string | null;
  };

  type Props = {
    tree: StructureHouse[];
    selection: StructureSelection;
    counts?: { houses: Map<string, number>; apartments: Map<string, number>; rooms: Map<string, number>; total: number };
    onSelect: (s: StructureSelection) => void;
  };
  let { tree, selection, counts, onSelect }: Props = $props();

  let openHouses = $state<Set<string>>(new Set());
  let openApartments = $state<Set<string>>(new Set());

  function toggleHouse(id: string) {
    const next = new Set(openHouses);
    if (next.has(id)) next.delete(id); else next.add(id);
    openHouses = next;
  }
  function toggleApt(id: string) {
    const next = new Set(openApartments);
    if (next.has(id)) next.delete(id); else next.add(id);
    openApartments = next;
  }

  function isActive(s: StructureSelection): boolean {
    return (
      selection.kind === s.kind &&
      selection.houseId === s.houseId &&
      selection.apartmentId === s.apartmentId &&
      selection.roomId === s.roomId
    );
  }
</script>

<aside class="struktur-sidebar" aria-label="Strukturbaum">
  <header class="struktur-head">
    <Icon name="building" size={12} />
    <span>Struktur</span>
  </header>
  <nav>
    <button
      class="node node-root"
      class:active={isActive({ kind: 'project', houseId: null, apartmentId: null, roomId: null })}
      onclick={() => onSelect({ kind: 'project', houseId: null, apartmentId: null, roomId: null })}
      type="button"
    >
      <span class="node-label">Projekt</span>
      {#if counts}<span class="node-count">{counts.total}</span>{/if}
    </button>
    {#each tree as h (h.id)}
      <button
        class="node node-house"
        class:active={isActive({ kind: 'house', houseId: h.id, apartmentId: null, roomId: null })}
        type="button"
      >
        <span class="node-toggle" onclick={(e) => { e.stopPropagation(); toggleHouse(h.id); }}>
          <Icon name={openHouses.has(h.id) ? 'chevron-down' : 'chevron-right'} size={10} />
        </span>
        <span class="node-label" onclick={() => onSelect({ kind: 'house', houseId: h.id, apartmentId: null, roomId: null })}>{h.name}</span>
        {#if counts?.houses.get(h.id)}<span class="node-count">{counts.houses.get(h.id)}</span>{/if}
      </button>
      {#if openHouses.has(h.id)}
        {#each h.apartments as a (a.id)}
          <button
            class="node node-apt"
            class:active={isActive({ kind: 'apartment', houseId: h.id, apartmentId: a.id, roomId: null })}
            type="button"
          >
            <span class="node-toggle" onclick={(e) => { e.stopPropagation(); toggleApt(a.id); }}>
              {#if a.rooms.length > 0}
                <Icon name={openApartments.has(a.id) ? 'chevron-down' : 'chevron-right'} size={10} />
              {/if}
            </span>
            <span class="node-label" onclick={() => onSelect({ kind: 'apartment', houseId: h.id, apartmentId: a.id, roomId: null })}>{a.name}</span>
            {#if counts?.apartments.get(a.id)}<span class="node-count">{counts.apartments.get(a.id)}</span>{/if}
          </button>
          {#if openApartments.has(a.id)}
            {#each a.rooms as r (r.id)}
              <button
                class="node node-room"
                class:active={isActive({ kind: 'room', houseId: h.id, apartmentId: a.id, roomId: r.id })}
                onclick={() => onSelect({ kind: 'room', houseId: h.id, apartmentId: a.id, roomId: r.id })}
                type="button"
              >
                <span class="node-label">{r.name}{#if r.raumnummer} <span class="node-num">{r.raumnummer}</span>{/if}</span>
                {#if counts?.rooms.get(r.id)}<span class="node-count">{counts.rooms.get(r.id)}</span>{/if}
              </button>
            {/each}
          {/if}
        {/each}
      {/if}
    {/each}
  </nav>
</aside>

<style>
  .struktur-sidebar { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 8px; }
  .struktur-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  nav { display: flex; flex-direction: column; gap: 2px; }
  .node { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: var(--r-sm); border: none; background: transparent; cursor: pointer; text-align: left; font-family: inherit; color: var(--ink); font-size: 13px; }
  .node:hover { background: var(--paper-tint); }
  .node.active { background: var(--red-soft); color: var(--red); }
  .node-root { font-weight: 700; }
  .node-house { padding-left: 4px; font-weight: 600; }
  .node-apt { padding-left: 24px; font-size: 12px; }
  .node-room { padding-left: 44px; font-size: 12px; color: var(--ink-2); }
  .node-toggle { width: 14px; min-width: 14px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); }
  .node-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .node-count { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--muted); padding: 1px 6px; background: var(--paper-tint); border-radius: 999px; }
  .node-num { font-family: var(--mono); font-size: 10px; color: var(--muted); }
</style>
