<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import { uploadPlanPdf } from '$lib/storage/plans';
  import { toast } from '$lib/components/Toast.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let uploading = $state(false);
  let pendingFile = $state<File | null>(null);
  let pendingName = $state('');

  async function chooseFile(files: FileList | null) {
    if (!files || !files[0]) return;
    pendingFile = files[0];
    pendingName = pendingFile.name.replace(/\.pdf$/i, '');
  }

  async function uploadAndSubmit() {
    if (!pendingFile) return;
    uploading = true;
    try {
      const { path, pageCount } = await uploadPlanPdf(parent.project.id, pendingFile);
      const fd = new FormData();
      fd.append('name', pendingName || pendingFile.name);
      fd.append('storagePath', path);
      fd.append('pageCount', String(pageCount));
      const res = await fetch('?/create', { method: 'POST', body: fd });
      if (res.redirected) location.href = res.url;
      else toast('Anlegen fehlgeschlagen.');
    } catch (e) {
      console.error(e);
      toast('Upload fehlgeschlagen.');
    } finally {
      uploading = false;
    }
  }
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project.id}/maengel`}>
    <Icon name="back" size={12} /> Zurück
  </a>

  <h2 class="section-title">Pläne <span class="count">{parent.plans.length}</span></h2>

  <label class="upload-card">
    <Icon name="upload" size={20} />
    <span>{uploading ? 'Lädt…' : 'PDF-Plan hochladen'}</span>
    <input type="file" accept="application/pdf" hidden onchange={(e) => chooseFile((e.currentTarget as HTMLInputElement).files)} />
  </label>

  {#if pendingFile}
    <div class="upload-pending">
      <input class="field-input" bind:value={pendingName} placeholder="Plan-Name (z.B. Grundriss EG Haus A)" />
      <button class="btn btn-primary btn-sm" onclick={uploadAndSubmit} disabled={uploading || !pendingName.trim()}>
        Hochladen
      </button>
    </div>
  {/if}

  {#if parent.plans.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Noch kein Plan hochgeladen.</div>
    </div>
  {:else}
    <div class="plan-list">
      {#each parent.plans as p (p.id)}
        <a class="plan-card" href={`/${parent.project.id}/maengel/plaene/${p.id}`}>
          <span class="plan-icon"><Icon name="file" size={20} /></span>
          <span class="plan-body">
            <span class="plan-name">{p.name}</span>
            <span class="plan-meta">
              v{p.version} · {p.pageCount ?? '?'} Seite{p.pageCount === 1 ? '' : 'n'} · {fmtDateDe(p.createdAt)}
            </span>
          </span>
          <span class="plan-defects">{p.defectCount} Mängel</span>
        </a>
      {/each}
    </div>
  {/if}
</div>

<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 12px; text-decoration: none; }
  .upload-card { display: flex; align-items: center; gap: 10px; padding: 16px; border: 2px dashed var(--line-strong); border-radius: var(--r-md); background: var(--paper-tint); justify-content: center; color: var(--muted); font-weight: 600; cursor: pointer; transition: all .15s; margin-bottom: 14px; }
  .upload-card:hover { border-color: var(--red); color: var(--red); }
  .upload-pending { display: flex; gap: 8px; align-items: center; margin-bottom: 14px; }
  .upload-pending .field-input { flex: 1; }
  .plan-list { display: flex; flex-direction: column; gap: 8px; }
  .plan-card { display: flex; gap: 12px; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 12px 14px; text-decoration: none; color: inherit; transition: all .12s; }
  .plan-card:hover { border-color: var(--ink); transform: translateY(-1px); box-shadow: var(--shadow-1); }
  .plan-icon { width: 38px; height: 38px; border-radius: 8px; background: var(--blue-soft); color: var(--blue); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .plan-body { flex: 1; min-width: 0; }
  .plan-name { font-family: var(--display); font-weight: 700; font-size: 14px; display: block; }
  .plan-meta { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .plan-defects { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--red); flex-shrink: 0; }
</style>
