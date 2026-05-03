<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import Icon from '$lib/components/Icon.svelte';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';
  import { uploadTaskPhoto, getSignedUrl } from '$lib/storage/photos';
  import { haptic } from '$lib/motion';

  let { data } = $props();
  let parent = $derived(data);

  let name = $state(data.task.name);
  let notes = $state(data.task.notes ?? '');
  let color = $state(data.task.color ?? '#3B6CC4');
  let progressPct = $state(data.task.progressPct ?? 0);
  let uploadingPhoto = $state(false);
  let photoUrls = $state<Record<string, string>>({});
  let lightbox = $state<string | null>(null);

  const SWATCHES = ['#E8833A', '#3B6CC4', '#3FAA60', '#D4A22A', '#7A7570', '#C9482F', '#1E96A8', '#7CB246'];

  $effect(() => {
    const photos = parent.photos ?? [];
    (async () => {
      const next: Record<string, string> = {};
      for (const p of photos) {
        if (photoUrls[p.id]) {
          next[p.id] = photoUrls[p.id];
          continue;
        }
        const url = await getSignedUrl('task-photos', p.storagePath, 600);
        if (url) next[p.id] = url;
      }
      photoUrls = next;
    })();
  });

  async function onTaskPhotoFiles(files: FileList | null) {
    if (!files) return;
    uploadingPhoto = true;
    try {
      for (const f of Array.from(files)) {
        const { path } = await uploadTaskPhoto(parent.project.id, parent.task.id, f);
        const fd = new FormData();
        fd.append('storagePath', path);
        await fetch('?/linkPhoto', { method: 'POST', body: fd });
      }
      haptic(15);
      toast('Fotos hochgeladen.');
      await invalidateAll();
    } catch (e) {
      console.error(e);
      toast('Foto-Upload fehlgeschlagen.');
    } finally {
      uploadingPhoto = false;
    }
  }

  async function delTaskPhoto(photoId: string) {
    if (!(await confirm({ title: 'Foto löschen?', confirmLabel: 'Löschen', danger: true }))) return;
    const fd = new FormData();
    fd.append('photoId', photoId);
    await fetch('?/deletePhoto', { method: 'POST', body: fd });
    await invalidateAll();
  }

  async function postForm(action: string, fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
    return res.ok;
  }

  async function save() {
    const ok = await postForm('saveFields', { name, notes, color });
    toast(ok ? 'Gespeichert.' : 'Fehler beim Speichern.');
  }

  let progressSaveTimer: ReturnType<typeof setTimeout> | null = null;
  async function commitProgress() {
    const ok = await postForm('setProgress', { pct: String(progressPct) });
    if (!ok) toast('Fortschritt konnte nicht gespeichert werden.');
  }
  function onProgressInput() {
    if (progressSaveTimer) clearTimeout(progressSaveTimer);
    progressSaveTimer = setTimeout(commitProgress, 350);
  }

  async function toggleApt(apartmentId: string, done: boolean) {
    await postForm('setApartment', { apartmentId, done: String(done) });
    toast(done ? 'Wohnung erledigt.' : 'Zurückgesetzt.');
    location.reload();
  }

  async function del() {
    if (!(await confirm({ title: 'Termin wirklich löschen?', description: 'Alle zugehörigen Daten gehen verloren.', confirmLabel: 'Löschen', danger: true }))) return;
    const ok = await postForm('delete', {});
    if (ok) {
      toast('Termin gelöscht.');
      goto(`/${parent.project.id}/bauzeitenplan`);
    }
  }

  function progressFor(apartmentId: string) {
    return parent.apartmentProgress.find((p) => p.apartmentId === apartmentId);
  }

  let isPerApartment = $derived(parent.gewerk?.defaultPerApartment ?? parent.task.perApartment);
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project.id}/bauzeitenplan`}>
    <Icon name="back" size={12} /> Zurück zum Plan
  </a>

  <div class="detail-header">
    <div class="detail-num-row">
      <span class="task-color-dot" style={`background:${color}`}></span>
      <span class="num-tag">{parent.task.num ?? ''}</span>
    </div>
    <input class="detail-title-input" bind:value={name} onblur={save} />
    <div class="meta-row">
      <span><b>Start:</b> {parent.task.startDate}</span>
      <span><b>Ende:</b> {parent.task.endDate}</span>
      <span><b>Dauer:</b> {parent.task.durationAt ?? '-'} AT</span>
      {#if parent.gewerk}<span><b>Gewerk:</b> {parent.gewerk.name}</span>{/if}
    </div>
  </div>

  <div class="field">
    <div class="field-label-row">
      <label class="field-label" for="task-progress">Fortschritt</label>
      <span class="progress-value">{progressPct}%</span>
    </div>
    <input
      id="task-progress"
      type="range"
      min="0"
      max="100"
      step="5"
      bind:value={progressPct}
      oninput={onProgressInput}
      onchange={commitProgress}
      class="progress-slider"
      style={`--p:${progressPct}%; --c:${color}`}
    />
  </div>

  <div class="field">
    <span class="field-label">Farbe</span>
    <div class="task-color-row">
      {#each SWATCHES as c}
        <button class="task-color-swatch" class:active={color === c} style={`background:${c}`} aria-label={`Farbe ${c}`} onclick={() => { color = c; save(); }}></button>
      {/each}
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="task-notes">Notizen</label>
    <textarea id="task-notes" class="field-input" rows="3" bind:value={notes} onblur={save}></textarea>
  </div>

  <h3 class="section-title">Rückmeldung (Ist-Daten)</h3>
  <div class="field-row">
    <div class="field">
      <label class="field-label" for="actual-start">Ist-Start</label>
      <input id="actual-start" type="date" class="field-input" value={parent.task.actualStartDate ?? ''} onchange={async (e) => {
        const v = (e.currentTarget as HTMLInputElement).value;
        await postForm('setActualDates', { actualStartDate: v, actualEndDate: parent.task.actualEndDate ?? '' });
        toast('Ist-Start gespeichert.');
      }} />
    </div>
    <div class="field">
      <label class="field-label" for="actual-end">Ist-Ende</label>
      <input id="actual-end" type="date" class="field-input" value={parent.task.actualEndDate ?? ''} onchange={async (e) => {
        const v = (e.currentTarget as HTMLInputElement).value;
        await postForm('setActualDates', { actualStartDate: parent.task.actualStartDate ?? '', actualEndDate: v });
        toast('Ist-Ende gespeichert.');
      }} />
    </div>
  </div>
  {#if parent.task.actualStartDate || parent.task.actualEndDate}
    <p class="field-hint">
      Plan: {parent.task.startDate} → {parent.task.endDate}
      {#if parent.task.actualEndDate && parent.task.actualEndDate > parent.task.endDate}
        · <span style="color:var(--red);font-weight:700">Verzug: {Math.round((new Date(parent.task.actualEndDate).getTime() - new Date(parent.task.endDate).getTime()) / 86400000)} Tage</span>
      {:else if parent.task.actualEndDate}
        · <span style="color:var(--green);font-weight:700">Pünktlich</span>
      {/if}
    </p>
  {/if}

  <div class="field">
    <span class="field-label">Fotos {parent.photos?.length ?? 0}</span>
    <div class="task-photos">
      {#each parent.photos ?? [] as p (p.id)}
        <div class="task-photo-tile">
          {#if photoUrls[p.id]}
            <button class="task-photo-img" onclick={() => (lightbox = photoUrls[p.id])} aria-label="Foto vergrößern" type="button">
              <img src={photoUrls[p.id]} alt={p.caption ?? 'Termin-Foto'} />
            </button>
          {/if}
          <button class="task-photo-del" onclick={() => delTaskPhoto(p.id)} aria-label="Foto löschen" type="button">
            <Icon name="close" size={11} />
          </button>
        </div>
      {/each}
      <label class="task-photo-add">
        <Icon name="photo" size={20} />
        <span>{uploadingPhoto ? 'Lädt…' : 'Foto'}</span>
        <input type="file" accept="image/*" capture="environment" multiple hidden onchange={(e) => onTaskPhotoFiles((e.currentTarget as HTMLInputElement).files)} />
      </label>
    </div>
  </div>

  {#if parent.predecessors.length > 0}
    <div class="field">
      <span class="field-label">Vorgänger</span>
      <div class="dep-list">
        {#each parent.predecessors as p}
          <span class="dep-pill">{p.task?.num ?? ''} {p.task?.name ?? '?'} <span class="dep-type">{p.type} {p.lagDays !== 0 ? (p.lagDays > 0 ? `+${p.lagDays}` : p.lagDays) + 'd' : ''}</span></span>
        {/each}
      </div>
    </div>
  {/if}
  {#if parent.successors.length > 0}
    <div class="field">
      <span class="field-label">Nachfolger</span>
      <div class="dep-list">
        {#each parent.successors as s}
          <span class="dep-pill">{s.task?.num ?? ''} {s.task?.name ?? '?'}</span>
        {/each}
      </div>
    </div>
  {/if}

  <div class="field">
    <span class="field-label">Verknüpfte Mängel <span class="count">{parent.linkedDefects?.length ?? 0}</span></span>
    {#if (parent.linkedDefects?.length ?? 0) > 0}
      <div class="defect-link-list">
        {#each parent.linkedDefects as d (d.id)}
          <a class="defect-link-card" href={`/${parent.project.id}/maengel/${d.id}`}>
            <span class="defect-link-dot" style={`background:${d.gewerkColor ?? '#9CA3AF'}`}></span>
            <span class="defect-link-id">{d.shortId}</span>
            <span class="defect-link-title">{d.title}</span>
            <span class="defect-link-status status-{d.status}">{d.status}</span>
          </a>
        {/each}
      </div>
    {:else}
      <p class="field-hint">Keine Mängel mit diesem Termin verknüpft. Mängel können im Mangel-Detail einem Termin zugeordnet werden.</p>
    {/if}
  </div>

  {#if isPerApartment && parent.apartments.length > 0}
    <h3 class="section-title">Pro Wohnung <span class="count">{parent.apartments.length}</span></h3>
    <div class="apt-grid">
      {#each parent.apartments as a (a.apartment.id)}
        {@const p = progressFor(a.apartment.id)}
        <div class="apt-card" class:done={p?.done}>
          <button class="apt-toggle" onclick={() => toggleApt(a.apartment.id, !(p?.done ?? false))}>
            <span class="apt-checkbox" class:checked={p?.done}>{#if p?.done}<Icon name="check" size={12} />{/if}</span>
            <span class="apt-text">
              <span class="apt-line1">{a.houseName} · {a.apartment.name}</span>
              {#if p?.doneDate}<span class="apt-line2">Fertig am {p.doneDate}</span>{/if}
            </span>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div style="margin-top:24px;display:flex;gap:8px">
    <button class="btn btn-danger" onclick={del}><Icon name="delete" size={14} /> Termin löschen</button>
  </div>
</div>

{#if lightbox}
  <button class="lightbox" onclick={() => (lightbox = null)} aria-label="Schließen">
    <img src={lightbox} alt="Foto vergrößert" />
  </button>
{/if}

<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 12px; text-decoration: none; }
  .back-link:hover { color: var(--ink); }
  .detail-header { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px; margin-bottom: 14px; box-shadow: var(--shadow-1); }
  .detail-num-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .task-color-dot { width: 16px; height: 16px; border-radius: 4px; display: inline-block; }
  .num-tag { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--muted); }
  .detail-title-input { width: 100%; font-family: var(--display); font-weight: 800; font-size: 22px; line-height: 1.1; letter-spacing: -.015em; border: none; padding: 6px 0 12px; background: transparent; }
  .detail-title-input:focus { border-bottom: 2px solid var(--red); outline: none; }
  .meta-row { display: flex; flex-wrap: wrap; gap: 10px 16px; font-family: var(--mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .meta-row b { color: var(--ink-2); font-weight: 700; }
  .task-color-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
  .task-color-swatch { width: 32px; height: 32px; border-radius: 8px; border: 2px solid var(--paper); box-shadow: 0 0 0 1px var(--line-strong); cursor: pointer; transition: transform .12s; }
  .task-color-swatch.active { box-shadow: 0 0 0 2px var(--ink); }
  .task-color-swatch:hover { transform: scale(1.1); }
  .dep-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
  .dep-pill { padding: 5px 9px; background: var(--paper-tint); border: 1px solid var(--line); border-radius: 999px; font-family: var(--mono); font-size: 11px; font-weight: 600; }
  .dep-type { color: var(--muted); margin-left: 4px; font-size: 10px; }
  .apt-grid { display: grid; grid-template-columns: 1fr; gap: 6px; }
  @media (min-width: 640px) { .apt-grid { grid-template-columns: repeat(2, 1fr); } }
  .apt-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); }
  .apt-card.done { background: var(--green-soft); border-color: rgba(46, 125, 50, .25); }
  .apt-toggle { width: 100%; display: flex; gap: 10px; padding: 10px 12px; align-items: center; text-align: left; cursor: pointer; font-family: inherit; }
  .apt-checkbox { width: 22px; height: 22px; border: 2px solid var(--line-strong); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: var(--paper); color: #fff; }
  .apt-checkbox.checked { background: var(--green); border-color: var(--green); }
  .apt-text { flex: 1; min-width: 0; }
  .apt-line1 { display: block; font-size: 14px; font-weight: 600; }
  .apt-line2 { display: block; font-family: var(--mono); font-size: 11px; color: var(--muted); margin-top: 2px; }
  .task-photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 8px; margin-top: 4px; }
  .task-photo-tile { aspect-ratio: 1; border-radius: var(--r-md); overflow: hidden; background: var(--grey-soft); border: 1px solid var(--line); position: relative; }
  .task-photo-img { width: 100%; height: 100%; padding: 0; border: none; cursor: zoom-in; }
  .task-photo-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .task-photo-del { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; background: rgba(15, 15, 16, .7); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .task-photo-add { aspect-ratio: 1; border: 2px dashed var(--line-strong); border-radius: var(--r-md); background: var(--paper-tint); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); cursor: pointer; }
  .task-photo-add:hover { border-color: var(--red); color: var(--red); background: var(--red-soft); }
  .task-photo-add span { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, .95); display: flex; align-items: center; justify-content: center; padding: 0; border: none; cursor: zoom-out; }
  .lightbox img { max-width: 96vw; max-height: 92vh; object-fit: contain; }
  .field-label-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
  .progress-value { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--ink-2); }
  .progress-slider { width: 100%; height: 6px; appearance: none; background: linear-gradient(to right, var(--c, var(--blue)) 0 var(--p), var(--grey-soft) var(--p) 100%); border-radius: 999px; outline: none; cursor: pointer; }
  .progress-slider::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--paper); border: 2px solid var(--c, var(--blue)); cursor: grab; box-shadow: var(--shadow-1); }
  .progress-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--paper); border: 2px solid var(--c, var(--blue)); cursor: grab; }
  .defect-link-list { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
  .defect-link-card { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); text-decoration: none; color: inherit; transition: all .12s; min-height: 44px; }
  .defect-link-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-1); }
  .defect-link-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .defect-link-id { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
  .defect-link-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .defect-link-status { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; flex-shrink: 0; }
  .defect-link-status.status-open, .defect-link-status.status-reopened { background: var(--red-soft); color: var(--red); }
  .defect-link-status.status-sent, .defect-link-status.status-acknowledged { background: var(--amber-soft); color: var(--amber); }
  .defect-link-status.status-resolved, .defect-link-status.status-accepted { background: var(--green-soft); color: var(--green); }
  .defect-link-status.status-rejected { background: var(--grey-soft); color: var(--muted); }
</style>
