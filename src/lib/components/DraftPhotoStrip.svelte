<script lang="ts" module>
  /** Photo entry pending DB-link (already uploaded to storage). */
  export type DraftPhoto = {
    storagePath: string;
    width: number;
    height: number;
    objectUrl: string; // browser-local preview URL
  };
</script>

<script lang="ts">
  /**
   * Foto-First-Strip used at the top of "neuer Mangel"-sheets.
   * - Tap-Card: opens native camera (capture=environment)
   * - Multiple photos hintereinander aufnehmen
   * - Each thumb is removable; thumbs reorder via tap (cover = first)
   * - Uploads stream to storage immediately under
   *   defect-photos/<projectId>/<draftId>/<photoId>.jpg
   *
   * Parent component reads `photos` for its hidden form-field
   * (JSON.stringify). Server action `?/create` parses it.
   */
  import Icon from './Icon.svelte';
  import { compressImage } from '$lib/storage/photos';
  import { getSupabaseBrowser } from '$lib/auth/supabase-browser';
  import { toast } from './Toast.svelte';
  import { haptic } from '$lib/motion';

  type Props = {
    projectId: string;
    photos: DraftPhoto[];
    draftId?: string;
  };

  let {
    projectId,
    photos = $bindable(),
    draftId = $bindable(crypto.randomUUID())
  }: Props = $props();

  let uploading = $state(false);
  let inputEl: HTMLInputElement | null = $state(null);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploading = true;
    haptic(8);
    try {
      const sb = getSupabaseBrowser();
      const next: DraftPhoto[] = [];
      for (const f of Array.from(files)) {
        const { blob, width, height } = await compressImage(f);
        const photoId = crypto.randomUUID();
        const storagePath = `${projectId}/${draftId}/${photoId}.jpg`;
        const { error } = await sb.storage.from('defect-photos').upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: false
        });
        if (error) throw error;
        next.push({
          storagePath,
          width,
          height,
          objectUrl: URL.createObjectURL(blob)
        });
      }
      photos = [...photos, ...next];
      haptic(15);
    } catch (e) {
      console.error(e);
      toast('Foto-Upload fehlgeschlagen.');
    } finally {
      uploading = false;
      if (inputEl) inputEl.value = '';
    }
  }

  async function remove(idx: number) {
    const ph = photos[idx];
    photos = photos.filter((_, i) => i !== idx);
    URL.revokeObjectURL(ph.objectUrl);
    try {
      const sb = getSupabaseBrowser();
      await sb.storage.from('defect-photos').remove([ph.storagePath]);
    } catch (_e) {
      // best-effort cleanup
    }
  }

  function makeCover(idx: number) {
    if (idx === 0) return;
    const next = [...photos];
    const [pulled] = next.splice(idx, 1);
    next.unshift(pulled);
    photos = next;
  }
</script>

<div class="draft-photos">
  <button class="capture-btn" onclick={() => inputEl?.click()} disabled={uploading} type="button">
    <Icon name="photo" size={20} />
    <span class="capture-label">
      {photos.length === 0 ? 'Foto aufnehmen' : 'Weiteres Foto'}
    </span>
    {#if uploading}<span class="capture-spinner"></span>{/if}
  </button>
  <input
    bind:this={inputEl}
    type="file"
    accept="image/*"
    capture="environment"
    multiple
    hidden
    onchange={(e) => onFiles((e.currentTarget as HTMLInputElement).files)}
  />

  {#if photos.length > 0}
    <div class="thumbs">
      {#each photos as p, i (p.storagePath)}
        <div class="thumb" class:cover={i === 0}>
          <button class="thumb-img" onclick={() => makeCover(i)} type="button" aria-label={i === 0 ? 'Cover-Foto' : 'Als Cover setzen'}>
            <img src={p.objectUrl} alt="" />
            {#if i === 0}<span class="thumb-badge">Cover</span>{/if}
          </button>
          <button class="thumb-del" onclick={() => remove(i)} aria-label="Foto entfernen" type="button">
            <Icon name="close" size={11} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .draft-photos { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .capture-btn {
    width: 100%; min-height: 64px;
    background: linear-gradient(135deg, var(--red-soft), var(--paper));
    border: 2px dashed var(--red);
    border-radius: var(--r-md);
    padding: 14px 18px;
    display: flex; align-items: center; gap: 12px; justify-content: center;
    color: var(--red); font-weight: 700;
    cursor: pointer;
    position: relative;
  }
  .capture-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--red-soft), var(--red-soft));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(227, 6, 19, 0.15);
  }
  .capture-btn:active:not(:disabled) { transform: scale(0.99); }
  .capture-label { font-size: 15px; }
  .capture-spinner {
    width: 16px; height: 16px;
    border: 2px solid var(--red-soft);
    border-top-color: var(--red);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .capture-spinner { animation: none; } }

  .thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 6px; }
  .thumb {
    position: relative; aspect-ratio: 1;
    border-radius: var(--r-md); overflow: hidden;
    background: var(--grey-soft); border: 1px solid var(--line);
  }
  .thumb.cover { border-color: var(--red); box-shadow: 0 0 0 1px var(--red); }
  .thumb-img { padding: 0; border: none; width: 100%; height: 100%; cursor: pointer; }
  .thumb-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .thumb-badge {
    position: absolute; bottom: 4px; left: 4px;
    background: var(--red); color: #fff;
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    padding: 2px 6px; border-radius: 4px;
    text-transform: uppercase; letter-spacing: .04em;
  }
  .thumb-del {
    position: absolute; top: 4px; right: 4px;
    width: 22px; height: 22px;
    background: rgba(15, 15, 16, 0.7); color: #fff;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
  }
</style>
