<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { uploadMusterdetailImage } from '$lib/storage/photos';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let uploading = $state(false);
  let lightbox = $state<string | null>(null);

  async function onFiles(files: FileList | null) {
    if (!files) return;
    uploading = true;
    try {
      for (const f of Array.from(files)) {
        const { path } = await uploadMusterdetailImage(parent.project.id, f);
        const fd = new FormData();
        fd.append('label', f.name.replace(/\.[a-z]+$/i, ''));
        fd.append('storagePath', path);
        await fetch('?/link', { method: 'POST', body: fd });
      }
      toast('Hochgeladen.');
      await invalidateAll();
    } catch (e) {
      console.error(e);
      toast('Upload fehlgeschlagen.');
    } finally {
      uploading = false;
    }
  }

  async function del(id: string) {
    if (!(await confirm({ title: 'Bild wirklich löschen?', confirmLabel: 'Löschen', danger: true }))) return;
    const fd = new FormData();
    fd.append('id', id);
    await fetch('?/delete', { method: 'POST', body: fd });
    await invalidateAll();
  }
</script>

<div class="page">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
    <h2 class="section-title" style="margin:0">Musterdetails <span class="count">{parent.items.length}</span></h2>
    <label class="btn btn-primary btn-sm" style="cursor:pointer">
      <Icon name="upload" size={14} /> {uploading ? 'Lädt…' : 'Bilder'}
      <input type="file" accept="image/*" multiple hidden onchange={(e) => onFiles((e.currentTarget as HTMLInputElement).files)} />
    </label>
  </div>

  {#if parent.items.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Konstruktionsdetails (Schnitte, Knoten) hier ablegen.</div>
    </div>
  {:else}
    <div class="muster-grid">
      {#each parent.items as it (it.id)}
        <div class="muster-card">
          <button class="muster-img" onclick={() => (lightbox = it.signedUrl)} aria-label={it.label}>
            {#if it.signedUrl}<img src={it.signedUrl} alt={it.label} />{/if}
          </button>
          <div class="muster-meta">
            <span class="muster-label">{it.label}</span>
            <button class="muster-del" onclick={() => del(it.id)} aria-label="Löschen"><Icon name="delete" size={12} /></button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if lightbox}
  <button class="scrim open" onclick={() => (lightbox = null)} aria-label="Schließen"></button>
  <div class="viewer open" style="display:flex">
    <button class="sheet-close" onclick={() => (lightbox = null)} aria-label="Schließen" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,.12);color:#fff"><Icon name="close" /></button>
    <img src={lightbox} alt="Musterdetail" />
  </div>
{/if}

<style>
  .muster-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  @media (min-width: 640px) { .muster-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 900px) { .muster-grid { grid-template-columns: repeat(4, 1fr); } }
  .muster-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); overflow: hidden; }
  .muster-img { width: 100%; aspect-ratio: 4/3; background: var(--grey-soft); display: block; cursor: zoom-in; padding: 0; border: none; }
  .muster-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .muster-meta { display: flex; align-items: center; gap: 6px; padding: 8px 10px; }
  .muster-label { flex: 1; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .muster-del { color: var(--muted); padding: 4px; cursor: pointer; }
  .muster-del:hover { color: var(--red); }
  .viewer { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, .95); align-items: center; justify-content: center; }
  .viewer img { max-width: 96vw; max-height: 92vh; object-fit: contain; }
</style>
