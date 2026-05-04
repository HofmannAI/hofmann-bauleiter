<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { getSignedUrl } from '$lib/storage/photos';
  import type { GalleryPhoto } from './+page.server';

  let { data } = $props();
  let parent = $derived(data);

  let groupBy = $state<'date' | 'gewerk' | 'apartment'>('date');
  let lightbox = $state<string | null>(null);
  let photoUrls = $state<Record<string, string>>({});

  $effect(() => {
    const toLoad = parent.photos.filter((p) => !photoUrls[p.id]);
    if (toLoad.length === 0) return;
    (async () => {
      const next = { ...photoUrls };
      for (const p of toLoad.slice(0, 30)) {
        const bucket = p.source === 'defect' ? 'defect-photos' : p.source === 'task' ? 'task-photos' : 'checklist-photos';
        const url = await getSignedUrl(bucket, p.storagePath, 600);
        if (url) next[p.id] = url;
      }
      photoUrls = next;
    })();
  });

  function grouped(): { label: string; photos: typeof parent.photos }[] {
    if (groupBy === 'gewerk') {
      const map = new Map<string, typeof parent.photos>();
      for (const p of parent.photos) {
        const key = p.gewerkName ?? 'Ohne Gewerk';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
      return [...map.entries()].map(([label, photos]) => ({ label, photos }));
    }
    if (groupBy === 'apartment') {
      const map = new Map<string, typeof parent.photos>();
      for (const p of parent.photos) {
        const key = p.houseName && p.apartmentName ? `${p.houseName} / ${p.apartmentName}` : 'Ohne Zuordnung';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(p);
      }
      return [...map.entries()].map(([label, photos]) => ({ label, photos }));
    }
    // date grouping — by day
    const map = new Map<string, typeof parent.photos>();
    for (const p of parent.photos) {
      const key = p.createdAt instanceof Date
        ? p.createdAt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date(p.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].map(([label, photos]) => ({ label, photos }));
  }

  const SOURCE_LABELS: Record<string, string> = { defect: 'Mangel', task: 'Termin', checklist: 'Checkliste' };
</script>

<svelte:head><title>Foto-Galerie · {parent.project?.name ?? ''}</title></svelte:head>

<div class="page">
  <div class="gallery-header">
    <h1 class="gallery-title">Foto-Galerie</h1>
    <span class="gallery-count">{parent.photos.length} Fotos</span>
    <select class="filter-select" bind:value={groupBy} style="margin-left:auto;width:auto">
      <option value="date">Nach Datum</option>
      <option value="gewerk">Nach Gewerk</option>
      <option value="apartment">Nach Wohnung</option>
    </select>
  </div>

  {#if parent.photos.length === 0}
    <div class="empty">
      <div class="empty-emoji">📷</div>
      <p class="empty-text">Noch keine Fotos in diesem Projekt.</p>
    </div>
  {:else}
    {#each grouped() as group}
      <h3 class="gallery-group-title">{group.label} <span class="count">{group.photos.length}</span></h3>
      <div class="gallery-grid">
        {#each group.photos as p (p.id)}
          <button class="gallery-tile" onclick={() => (lightbox = photoUrls[p.id] ?? null)}>
            {#if photoUrls[p.id]}
              <img src={photoUrls[p.id]} alt={p.sourceLabel} loading="lazy" />
            {:else}
              <span class="gallery-skeleton"></span>
            {/if}
            <span class="gallery-tile-meta">
              <span class="gallery-tile-source" style={p.gewerkColor ? `border-left:3px solid ${p.gewerkColor}` : ''}>
                {SOURCE_LABELS[p.source] ?? p.source}
              </span>
              <span class="gallery-tile-label">{p.sourceLabel}</span>
            </span>
          </button>
        {/each}
      </div>
    {/each}
  {/if}
</div>

{#if lightbox}
  <button class="lightbox" onclick={() => (lightbox = null)} aria-label="Schließen">
    <img src={lightbox} alt="Foto" />
  </button>
{/if}

<style>
  .gallery-header { display: flex; align-items: center; gap: var(--stack-md); margin-bottom: var(--stack-lg); flex-wrap: wrap; }
  .gallery-title { font-family: var(--display); font-weight: 700; font-size: 22px; margin: 0; }
  .gallery-count { font-size: 13px; color: var(--secondary); }
  .gallery-group-title { font-size: 15px; font-weight: 600; margin: var(--stack-lg) 0 var(--stack-md); display: flex; align-items: baseline; gap: var(--stack-md); }
  .gallery-group-title .count { font-size: 12px; color: var(--secondary); font-weight: 400; }

  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: var(--stack-md); }
  @media (min-width: 640px) { .gallery-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); } }

  .gallery-tile {
    aspect-ratio: 4/3; border-radius: var(--r-md); overflow: hidden;
    background: var(--surface-container-highest); border: 0.5px solid var(--outline-variant);
    position: relative; cursor: zoom-in; padding: 0;
    transition: transform var(--d-fast) var(--ease-out-expo);
  }
  .gallery-tile:hover { transform: scale(1.02); }
  .gallery-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gallery-skeleton { display: block; width: 100%; height: 100%; background: var(--surface-container); }
  .gallery-tile-meta {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 4px 6px; background: linear-gradient(transparent, rgba(0,0,0,0.6));
    display: flex; flex-direction: column; gap: 1px;
  }
  .gallery-tile-source { font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.8); text-transform: uppercase; padding-left: 6px; }
  .gallery-tile-label { font-size: 11px; color: #fff; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; padding: 0; border: none; cursor: zoom-out; }
  .lightbox img { max-width: 96vw; max-height: 92vh; object-fit: contain; }

  .filter-select { min-height: 36px; padding: 4px 8px; border: 1px solid var(--outline-variant); border-radius: var(--r-sm); background: var(--surface-container-lowest); font-size: 13px; font-family: inherit; }
</style>
