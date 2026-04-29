<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import PhotoAnnotator from '$lib/components/PhotoAnnotator.svelte';
  import VoiceInput from '$lib/components/VoiceInput.svelte';
  import { uploadDefectPhoto, getSignedUrl } from '$lib/storage/photos';
  import { toast } from '$lib/components/Toast.svelte';
  import { invalidateAll } from '$app/navigation';
  import { fmtDateDe, timeAgo } from '$lib/util/time';
  import { haptic } from '$lib/motion';
  import { getSupabaseBrowser } from '$lib/auth/supabase-browser';

  let { data } = $props();
  let parent = $derived(data);

  let title = $state(data.defect.title);
  let description = $state(data.defect.description ?? '');
  let gewerkId = $state(data.defect.gewerkId ?? '');
  let contactId = $state(data.defect.contactId ?? '');
  let deadline = $state(data.defect.deadline ?? '');
  let followupDate = $state(data.defect.followupDate ?? '');
  let priority = $state(String(data.defect.priority ?? 2));
  let status = $state<'open' | 'sent' | 'acknowledged' | 'resolved' | 'accepted' | 'rejected' | 'reopened'>(data.defect.status);

  let photoUrls = $state<Record<string, string>>({});
  let photoUploading = $state(false);
  let mailtoOpen = $state(false);
  let annotating = $state<{ photoId: string; url: string } | null>(null);
  let lightbox = $state<string | null>(null);

  async function loadPhotoUrls() {
    const out: Record<string, string> = {};
    for (const p of parent.photos) {
      const url = await getSignedUrl('defect-photos', p.storagePath, 600);
      if (url) out[p.id] = url;
    }
    photoUrls = out;
  }

  $effect(() => {
    loadPhotoUrls();
  });

  async function postForm(action: string, fields: Record<string, string>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, v);
    return await fetch(`?/${action}`, { method: 'POST', body: fd });
  }

  async function save() {
    const res = await postForm('saveFields', { title, description, gewerkId, contactId, deadline, followupDate, priority, status });
    if (res.ok) toast('Gespeichert.');
    else toast('Fehler.');
  }

  async function setStatus(s: typeof status) {
    status = s;
    const res = await postForm('saveFields', { status });
    if (res.ok) {
      toast(`Status: ${s}`);
      await invalidateAll();
    }
  }

  async function onPhotos(files: FileList | null) {
    if (!files) return;
    photoUploading = true;
    try {
      for (const f of Array.from(files)) {
        const { path } = await uploadDefectPhoto(parent.project.id, parent.defect.id, f);
        await postForm('linkPhoto', { storagePath: path });
      }
      toast('Fotos hochgeladen.');
      await invalidateAll();
    } catch (e) {
      console.error(e);
      toast('Upload fehlgeschlagen.');
    } finally {
      photoUploading = false;
    }
  }

  async function delPhoto(photoId: string) {
    if (!confirm('Foto löschen?')) return;
    await postForm('deletePhoto', { photoId });
    await invalidateAll();
  }

  function startAnnotate(photoId: string) {
    const url = photoUrls[photoId];
    if (!url) return;
    annotating = { photoId, url };
  }

  async function saveAnnotated(blob: Blob) {
    if (!annotating) return;
    try {
      const sb = getSupabaseBrowser();
      const photoId = crypto.randomUUID();
      const path = `${parent.project.id}/${parent.defect.id}/${photoId}.jpg`;
      const { error } = await sb.storage.from('defect-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      await postForm('linkPhoto', { storagePath: path, caption: 'annotiert' });
      haptic(15);
      toast('Annotation gespeichert.');
      annotating = null;
      await invalidateAll();
    } catch (e) {
      console.error(e);
      toast('Fehler beim Speichern.');
    }
  }

  function buildMailto(): string {
    const c = parent.contacts.find((x) => x.id === contactId) ?? parent.contact;
    const email = c?.email ?? '';
    const subject = encodeURIComponent(`Mängelmeldung ${parent.project.name} - ${parent.gewerk?.name ?? ''}`);
    const body = encodeURIComponent(
      `Sehr geehrte Damen und Herren,\n\n` +
        `bezugnehmend auf das Bauvorhaben "${parent.project.name}" möchten wir Ihnen folgenden Mangel melden:\n\n` +
        `${parent.defect.shortId}: ${title}\n` +
        (description ? `\n${description}\n` : '') +
        (deadline ? `\nFristsetzung zur Behebung: ${fmtDateDe(deadline)}\n` : '') +
        `\nBitte bestätigen Sie kurz den Empfang.\n\n` +
        `Mit freundlichen Grüßen\nIhr Bauleiter`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  async function sendDefect() {
    // Open mailto, then mark as sent
    window.location.href = buildMailto();
    await postForm('saveFields', { status: 'sent' });
    toast('Outlook geöffnet. Status auf "Gesendet" gesetzt.');
    await invalidateAll();
  }
</script>

<div class="page">
  <a class="back-link" href={`/${parent.project.id}/maengel`}>
    <Icon name="back" size={12} /> Zurück zur Liste
  </a>

  <div class="defect-header">
    <span class="defect-num-tag">{parent.defect.shortId}</span>
    <input class="defect-title-input" bind:value={title} onblur={save} />
    <span class="status-pill status-{status}">{status}</span>
  </div>

  <div class="status-actions">
    {#each (['acknowledged','resolved','accepted','rejected','reopened'] as const) as s}
      <button class="btn btn-ghost btn-sm" onclick={() => setStatus(s)}>{s}</button>
    {/each}
  </div>

  <div class="field">
    <div class="field-label-row">
      <label class="field-label" for="d">Beschreibung</label>
      <div style="display:flex;align-items:center;gap:6px">
        {#if parent.textbausteine.length > 0}
          <select
            class="textbaustein-picker"
            onchange={(e) => {
              const id = (e.currentTarget as HTMLSelectElement).value;
              if (!id) return;
              const tb = parent.textbausteine.find((x) => x.id === id);
              if (!tb) return;
              description = description ? description + '\n\n' + tb.body : tb.body;
              (e.currentTarget as HTMLSelectElement).value = '';
              save();
            }}
            aria-label="Textbaustein einfügen"
          >
            <option value="">+ Textbaustein</option>
            {#each parent.gewerke as g}
              {@const items = parent.textbausteine.filter((tb) => tb.gewerkId === g.id)}
              {#if items.length > 0}
                <optgroup label={g.name}>
                  {#each items as tb}
                    <option value={tb.id}>{tb.label}</option>
                  {/each}
                </optgroup>
              {/if}
            {/each}
          </select>
        {/if}
        <VoiceInput onResult={(t) => (description = t)} />
      </div>
    </div>
    <textarea id="d" class="field-input" rows="4" bind:value={description} onblur={save}></textarea>
  </div>

  <div class="field-row">
    <div class="field">
      <label class="field-label" for="g">Gewerk</label>
      <select id="g" class="field-input" bind:value={gewerkId} onchange={save}>
        <option value="">— wählen —</option>
        {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
      </select>
    </div>
    <div class="field">
      <label class="field-label" for="p">Priorität</label>
      <select id="p" class="field-input" bind:value={priority} onchange={save}>
        <option value="1">Hoch</option>
        <option value="2">Normal</option>
        <option value="3">Niedrig</option>
      </select>
    </div>
  </div>

  <div class="field-row">
    <div class="field">
      <label class="field-label" for="dl">Deadline</label>
      <input id="dl" type="date" class="field-input" bind:value={deadline} onblur={save} />
    </div>
    <div class="field">
      <label class="field-label" for="wv">Wiedervorlage</label>
      <input id="wv" type="date" class="field-input" bind:value={followupDate} onblur={save} />
    </div>
  </div>

  <div class="field">
    <label class="field-label" for="c">Kontakt (Handwerker)</label>
    <select id="c" class="field-input" bind:value={contactId} onchange={save}>
      <option value="">— wählen —</option>
      {#each parent.contacts.filter((x) => !gewerkId || x.gewerkId === gewerkId) as c}
        <option value={c.id}>{c.company} ({c.email ?? '—'})</option>
      {/each}
    </select>
  </div>

  <h3 class="section-title">Fotos <span class="count">{parent.photos.length}</span></h3>
  <div class="photos-grid">
    {#each parent.photos as p (p.id)}
      <div class="photo-tile">
        {#if photoUrls[p.id]}
          <button class="photo-tile-img" onclick={() => (lightbox = photoUrls[p.id])} aria-label="Foto vergrößern">
            <img src={photoUrls[p.id]} alt={p.caption ?? 'Mangel-Foto'} />
          </button>
          {#if p.caption === 'annotiert'}<span class="photo-badge">✎</span>{/if}
        {/if}
        <button class="photo-tile-action photo-tile-anno" onclick={() => startAnnotate(p.id)} aria-label="Annotieren">
          <Icon name="edit" size={12} />
        </button>
        <button class="photo-tile-action photo-tile-del" onclick={() => delPhoto(p.id)} aria-label="Foto löschen">
          <Icon name="close" size={12} />
        </button>
      </div>
    {/each}
    <label class="photo-add-tile">
      <Icon name="photo" size={22} />
      <span>{photoUploading ? 'Lädt…' : 'Foto'}</span>
      <input type="file" accept="image/*" capture="environment" multiple hidden onchange={(e) => onPhotos((e.currentTarget as HTMLInputElement).files)} />
    </label>
  </div>

  <h3 class="section-title">Verlauf</h3>
  <div class="activity-feed">
    {#each parent.history as h (h.id)}
      <div class="activity-item">
        <span class="activity-icon"><Icon name="clock" size={14} /></span>
        <span class="activity-text">
          <span class="activity-line1">{h.action}</span>
          <span class="activity-line2">{timeAgo(h.createdAt)}</span>
        </span>
      </div>
    {/each}
  </div>

  <div style="margin-top:24px">
    <button class="btn btn-primary btn-block" onclick={sendDefect} disabled={!contactId}>
      <Icon name="send" size={16} /> An Handwerker senden (Outlook)
    </button>
    {#if !contactId}
      <p class="field-hint" style="text-align:center;margin-top:6px">Erst Kontakt auswählen.</p>
    {:else}
      <p class="field-hint" style="text-align:center;margin-top:6px">
        Outlook öffnet sich. Falls Foto-PDF nötig: erst auf <a href={`/${parent.project.id}/maengel/report?gewerk=${gewerkId}`}>Gewerk-Report</a> gehen.
      </p>
    {/if}
  </div>
</div>

{#if annotating}
  <PhotoAnnotator
    sourceUrl={annotating.url}
    onCancel={() => (annotating = null)}
    onSave={saveAnnotated}
  />
{/if}

{#if lightbox}
  <button class="lightbox" onclick={() => (lightbox = null)} aria-label="Schließen">
    <img src={lightbox} alt="Foto vergrößert" />
  </button>
{/if}

<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 12px; text-decoration: none; }
  .back-link:hover { color: var(--ink); }
  .defect-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .defect-num-tag { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--ink); background: var(--paper-tint); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); }
  .defect-title-input { flex: 1; min-width: 200px; font-family: var(--display); font-weight: 800; font-size: 22px; line-height: 1.1; letter-spacing: -.015em; border: none; padding: 4px 0; background: transparent; }
  .defect-title-input:focus { border-bottom: 2px solid var(--red); outline: none; }
  .status-pill { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
  .status-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .photo-tile { aspect-ratio: 1; border-radius: var(--r-md); overflow: hidden; background: var(--grey-soft); border: 1px solid var(--line); position: relative; }
  .photo-tile-img { width: 100%; height: 100%; padding: 0; border: none; cursor: zoom-in; }
  .photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .photo-tile-action { position: absolute; width: 26px; height: 26px; background: rgba(15, 15, 16, .7); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
  .photo-tile-anno { top: 4px; left: 4px; }
  .photo-tile-del { top: 4px; right: 4px; }
  .photo-badge { position: absolute; bottom: 4px; left: 4px; background: var(--red); color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; }
  .lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0, 0, 0, .95); display: flex; align-items: center; justify-content: center; padding: 0; border: none; cursor: zoom-out; }
  .lightbox img { max-width: 96vw; max-height: 92vh; object-fit: contain; }
  .field-label-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
  .field-label-row .field-label { margin-bottom: 0; }
  .textbaustein-picker { background: var(--paper-tint); border: 1px solid var(--line-strong); border-radius: 8px; padding: 6px 10px; font-size: 12px; font-family: inherit; cursor: pointer; }
  .textbaustein-picker:hover { border-color: var(--red); color: var(--red); }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; margin-bottom: 14px; }
  .photo-add-tile { aspect-ratio: 1; border: 2px dashed var(--line-strong); border-radius: var(--r-md); background: var(--paper-tint); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); transition: all .15s; cursor: pointer; }
  .photo-add-tile:hover { border-color: var(--red); color: var(--red); background: var(--red-soft); }
  .photo-add-tile span { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
  .status-open, .status-reopened { background: var(--red-soft); color: var(--red); }
  .status-sent, .status-acknowledged { background: var(--amber-soft); color: var(--amber); }
  .status-resolved, .status-accepted { background: var(--green-soft); color: var(--green); }
  .status-rejected { background: var(--grey-soft); color: var(--muted); }
</style>
