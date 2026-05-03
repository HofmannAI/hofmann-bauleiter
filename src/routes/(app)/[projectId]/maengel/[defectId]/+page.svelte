<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import PhotoAnnotator from '$lib/components/PhotoAnnotator.svelte';
  import VoiceInput from '$lib/components/VoiceInput.svelte';
  import VorgangTimeline from '$lib/components/VorgangTimeline.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import { uploadDefectPhoto, getSignedUrl } from '$lib/storage/photos';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';
  import { invalidateAll } from '$app/navigation';
  import { fmtDateDe, timeAgo } from '$lib/util/time';
  import { haptic } from '$lib/motion';
  import { getSupabaseBrowser } from '$lib/auth/supabase-browser';

  let { data } = $props();
  let parent = $derived(data);

  // ----- Vorgang dialogs -----
  let showVorgang = $state<{ partei: 'AN' | 'AG' } | null>(null);
  let vStatus = $state<string>('notiz');
  let vBeschreibung = $state('');
  let vTermin = $state('');
  let vTerminAntwort = $state('');

  function openVorgang(partei: 'AN' | 'AG') {
    showVorgang = { partei };
    vStatus = partei === 'AN' ? 'angezeigt' : 'kontrolle_AG';
    vBeschreibung = '';
    vTermin = '';
    vTerminAntwort = '';
  }
  async function submitVorgang() {
    if (!showVorgang) return;
    const fd = new FormData();
    fd.append('partei', showVorgang.partei);
    fd.append('status', vStatus);
    fd.append('beschreibung', vBeschreibung);
    fd.append('termin', vTermin);
    fd.append('terminAntwort', vTerminAntwort);
    const res = await fetch('?/addVorgang', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Vorgang gespeichert.');
      showVorgang = null;
      await invalidateAll();
    } else {
      toast('Fehler.');
    }
  }

  // ----- Mängelrüge dialog -----
  let showRuege = $state(false);
  let ruegeContactId = $state(data.defect.contactId ?? '');
  let ruegeFrist = $state(addDaysIso(14));
  let ruegeRechtsgrund = $state(data.defect.rechtsgrundlage ?? '§4 Abs.7 VOB/B');
  let ruegeVorlageId = $state('');
  let ruegeProcessing = $state(false);

  function addDaysIso(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async function generateRuege() {
    if (ruegeProcessing) return;
    ruegeProcessing = true;
    try {
      const { generateMaengelruege, downloadBlob, renderVorlage } = await import('$lib/pdf/maengelruege');
      const empf = parent.contacts.find((c) => c.id === ruegeContactId) ?? parent.contact;
      const vorlage = parent.briefVorlagen.find((v) => v.id === ruegeVorlageId)
        ?? parent.briefVorlagen.find((v) => v.typ === 'mängelrüge_vorabnahme')
        ?? null;
      if (!vorlage) {
        toast('Keine Brief-Vorlage gefunden.');
        return;
      }
      const unterzeichner = parent.firma?.unterzeichner1 ?? 'Bauleitung';
      const brieftext = renderVorlage(vorlage.vorlageText, {
        projekt: parent.project.name,
        frist: fmtDateDe(ruegeFrist),
        rechtsgrundlage: ruegeRechtsgrund,
        unterzeichner
      });

      const photoRes = await fetch(`/${parent.project.id}/maengel/${parent.defect.id}/photos.json`);
      const photos = photoRes.ok ? ((await photoRes.json()) as { storagePath: string }[]) : [];

      const blob = await generateMaengelruege({
        projektName: parent.project.name,
        empfaenger: {
          company: empf?.company ?? null,
          contactName: empf?.contactName ?? null,
          address: empf?.address ?? null,
          email: empf?.email ?? null
        },
        frist: ruegeFrist,
        rechtsgrundlage: ruegeRechtsgrund,
        brieftextRendered: brieftext,
        unterzeichner,
        defects: [
          {
            shortId: parent.defect.shortId,
            title: parent.defect.title,
            description: parent.defect.description,
            apartmentLabel: parent.apartment ? `${parent.apartment.name}` : null,
            planCropPath: parent.defect.planCropPath ?? null,
            firstPhotoPath: photos[0]?.storagePath ?? null
          }
        ],
        firma: {
          name: parent.firma?.name ?? 'Hofmann Haus GmbH',
          strasse: parent.firma?.strasse ?? '',
          plzOrt: parent.firma?.plzOrt ?? '',
          telefon: parent.firma?.telefon ?? null,
          email: parent.firma?.email ?? null,
          web: parent.firma?.web ?? null,
          unterzeichner1: parent.firma?.unterzeichner1 ?? null,
          unterzeichner2: parent.firma?.unterzeichner2 ?? null
        }
      });

      downloadBlob(blob, `Maengelruege_${parent.defect.shortId ?? 'M'}_${ruegeFrist}.pdf`);

      // Vorgang anlegen + Status setzen
      const fd = new FormData();
      fd.append('contactId', ruegeContactId);
      fd.append('frist', ruegeFrist);
      fd.append('rechtsgrundlage', ruegeRechtsgrund);
      if (ruegeVorlageId) fd.append('vorlageId', ruegeVorlageId);
      const res = await fetch('?/ruegeAnzeigen', { method: 'POST', body: fd });
      if (res.ok) {
        toast('Mängelrüge erstellt + Vorgang angelegt.');
        showRuege = false;
        await invalidateAll();
      } else {
        toast('PDF erstellt, aber Vorgang konnte nicht gespeichert werden.');
      }
    } catch (e) {
      console.error(e);
      toast('PDF-Generierung fehlgeschlagen.');
    } finally {
      ruegeProcessing = false;
    }
  }

  let title = $state(data.defect.title);
  let description = $state(data.defect.description ?? '');
  let gewerkId = $state(data.defect.gewerkId ?? '');
  let contactId = $state(data.defect.contactId ?? '');
  let taskId = $state(data.defect.taskId ?? '');

  // Filter tasks by same gewerk (if set), but always show all
  let filteredTasks = $derived.by(() => {
    const all = parent.projectTasks ?? [];
    if (!gewerkId) return all;
    // Show matching gewerk tasks first, then the rest
    const matching = all.filter((t) => t.gewerkId === gewerkId);
    const rest = all.filter((t) => t.gewerkId !== gewerkId);
    return [...matching, ...rest];
  });
  // Folgegewerk-Warnung: wenn dieser Mangel einem Termin zugeordnet ist
  // und dieser Termin Nachfolger hat, zeige welche Gewerke betroffen sind
  let folgewerkWarnung = $derived.by(() => {
    if (!taskId) return null;
    const deps = parent.taskDeps ?? [];
    const allTasks = parent.projectTasks ?? [];
    const gewerkeList = parent.gewerke ?? [];

    // Finde direkte Nachfolger des zugeordneten Termins
    const successorIds = deps.filter(d => d.predecessorId === taskId).map(d => d.successorId);
    if (successorIds.length === 0) return null;

    const successors = allTasks
      .filter(t => successorIds.includes(t.id))
      .map(t => {
        const g = gewerkeList.find(g => g.id === t.gewerkId);
        return { name: t.name, gewerk: g?.name ?? null };
      });

    if (successors.length === 0) return null;

    const namen = successors.map(s => s.gewerk ?? s.name).join(', ');
    return `Achtung: Dieser Mangel kann ${successors.length === 1 ? 'Folgegewerk' : 'Folgegewerke'} ${namen} verzögern.`;
  });

  let deadline = $state(data.defect.deadline ?? '');
  let followupDate = $state(data.defect.followupDate ?? '');
  let priority = $state(String(data.defect.priority ?? 2));
  let status = $state<'open' | 'sent' | 'acknowledged' | 'resolved' | 'accepted' | 'rejected' | 'reopened'>(data.defect.status);

  let photoUrls = $state<Record<string, string>>({});
  let photoUploading = $state(false);
  let mailtoOpen = $state(false);
  let annotating = $state<{ photoId: string; url: string } | null>(null);
  let lightbox = $state<string | null>(null);
  let planCropUrl = $state<string | null>(null);

  $effect(() => {
    const path = parent.defect.planCropPath;
    if (!path) { planCropUrl = null; return; }
    (async () => {
      planCropUrl = await getSignedUrl('defect-crops', path, 600);
    })();
  });

  let planLink = $derived.by(() => {
    const planId = parent.defect.planId;
    if (!planId) return null;
    const base = `/${parent.project.id}/maengel/plaene/${planId}`;
    const params = new URLSearchParams();
    if (parent.defect.page) params.set('page', String(parent.defect.page));
    if (parent.defect.id) params.set('defect', parent.defect.id);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  });

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
    const res = await postForm('saveFields', { title, description, gewerkId, contactId, taskId, deadline, followupDate, priority, status });
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
    if (!(await confirm({ title: 'Foto löschen?', confirmLabel: 'Löschen', danger: true }))) return;
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

  {#if parent.defect.planCropPath}
    <a class="plan-crop-section" href={planLink ?? '#'} aria-label="Plan-Ausschnitt im Plan-Viewer öffnen">
      <span class="plan-crop-img">
        {#if planCropUrl}
          <img src={planCropUrl} alt="Plan-Ausschnitt mit Pin-Markierung" />
        {:else}
          <span class="plan-crop-skeleton" aria-hidden="true"></span>
        {/if}
      </span>
      <span class="plan-crop-meta">
        <span class="plan-crop-eyebrow">Plan-Ausschnitt</span>
        <span class="plan-crop-hint">
          {#if parent.plan}
            Seite {parent.defect.page ?? 1} · {parent.plan.name}
          {:else}
            Klick öffnet Plan-Viewer
          {/if}
        </span>
        <span class="plan-crop-cta"><Icon name="file" size={11} /> Im Plan ansehen</span>
      </span>
    </a>
  {/if}

  <div class="status-actions">
    {#each (['acknowledged','resolved','accepted','rejected','reopened'] as const) as s}
      <button class="btn btn-ghost btn-sm" onclick={() => setStatus(s)}>{s}</button>
    {/each}
    <button class="btn btn-primary btn-sm" onclick={() => (showRuege = true)} type="button">
      <Icon name="send" size={12} /> Mängelrüge
    </button>
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

  <div class="field">
    <label class="field-label" for="tid">Verknüpfter Termin</label>
    <select id="tid" class="field-input" bind:value={taskId} onchange={save}>
      <option value="">— kein Termin —</option>
      {#each filteredTasks as t (t.id)}
        <option value={t.id}>{t.num ? `${t.num} ` : ''}{t.name} (Ende: {t.endDate})</option>
      {/each}
    </select>
    {#if taskId && parent.task}
      <a class="task-link-card" href={`/${parent.project.id}/bauzeitenplan/${taskId}`}>
        <span class="task-link-icon">📅</span>
        <span class="task-link-text">
          <span class="task-link-name">{parent.task.num ? `${parent.task.num} ` : ''}{parent.task.name}</span>
          <span class="task-link-date">Plan-Ende: {parent.task.endDate}</span>
        </span>
        <span class="task-link-arrow">→</span>
      </a>
    {/if}
    {#if folgewerkWarnung}
      <div class="folgewerk-warnung">
        <span class="folgewerk-icon">⚠️</span>
        <span>{folgewerkWarnung}</span>
      </div>
    {/if}
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

  <h3 class="section-title">VOB-Vorgänge</h3>
  <div class="vorgaenge-grid">
    <VorgangTimeline partei="AN" vorgaenge={parent.vorgaenge} onAdd={() => openVorgang('AN')} />
    <VorgangTimeline partei="AG" vorgaenge={parent.vorgaenge} onAdd={() => openVorgang('AG')} />
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

{#if showVorgang}
  <Sheet
    open={true}
    title={`Vorgang ${showVorgang.partei === 'AN' ? 'AN' : 'AG'} hinzufügen`}
    eyebrow="VOB-Vorgang"
    ariaLabel="Vorgang hinzufügen"
    onClose={() => (showVorgang = null)}
  >
    {#snippet body()}
      <div class="field">
        <label class="field-label" for="vstatus">Status</label>
        <select id="vstatus" class="field-input" bind:value={vStatus}>
          {#if showVorgang?.partei === 'AN'}
            <option value="angezeigt">Angezeigt (Mängelrüge versendet)</option>
            <option value="nachfrist">Nachfrist gesetzt</option>
            <option value="klaerung">Klärung läuft</option>
            <option value="freigemeldet_NU">Freigemeldet (NU)</option>
            <option value="abgelehnt_NU">Abgelehnt (NU)</option>
            <option value="ersatzvornahme">Ersatzvornahme</option>
            <option value="notiz">Notiz</option>
          {:else}
            <option value="erfasst">Erfasst</option>
            <option value="kontrolle_AG">Kontrolle</option>
            <option value="erledigt">Erledigt</option>
            <option value="notiz">Notiz</option>
          {/if}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="vbeschr">Beschreibung</label>
        <textarea id="vbeschr" class="field-input" rows="3" bind:value={vBeschreibung}></textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="vtermin">Termin / Frist</label>
          <input id="vtermin" type="date" class="field-input" bind:value={vTermin} />
        </div>
        <div class="field">
          <label class="field-label" for="vantwort">Antwort bis</label>
          <input id="vantwort" type="date" class="field-input" bind:value={vTerminAntwort} />
        </div>
      </div>
    {/snippet}
    {#snippet foot()}
      <button class="btn btn-primary btn-block" onclick={submitVorgang}>Speichern</button>
    {/snippet}
  </Sheet>
{/if}

{#if showRuege}
  <Sheet
    open={true}
    title="Mängelrüge erstellen"
    eyebrow="VOB-Schreiben"
    ariaLabel="Mängelrüge erstellen"
    onClose={() => (showRuege = false)}
  >
    {#snippet body()}
      <div class="field">
        <label class="field-label" for="ruege-c">Empfänger (Handwerker-Kontakt)</label>
        <select id="ruege-c" class="field-input" bind:value={ruegeContactId}>
          <option value="">— wählen —</option>
          {#each parent.contacts as c (c.id)}
            <option value={c.id}>{c.company} {c.contactName ? `· ${c.contactName}` : ''}</option>
          {/each}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="ruege-f">Frist zur Beseitigung</label>
          <input id="ruege-f" type="date" class="field-input" bind:value={ruegeFrist} />
        </div>
        <div class="field">
          <label class="field-label" for="ruege-r">Rechtsgrundlage</label>
          <select id="ruege-r" class="field-input" bind:value={ruegeRechtsgrund}>
            <option value="§4 Abs.7 VOB/B">§4 Abs.7 VOB/B (vor Abnahme)</option>
            <option value="§13 Abs.5 Nr.1 VOB/B">§13 Abs.5 Nr.1 VOB/B (nach Abnahme)</option>
            <option value="BGB §634 Nr.1">BGB §634 Nr.1</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="ruege-v">Brief-Vorlage</label>
        <select id="ruege-v" class="field-input" bind:value={ruegeVorlageId}>
          <option value="">— Standard nach Rechtsgrundlage —</option>
          {#each parent.briefVorlagen as v (v.id)}
            <option value={v.id}>{v.name}</option>
          {/each}
        </select>
      </div>
      <p class="field-hint" style="margin-top:8px">
        Erzeugt ein PDF-Anschreiben mit Anlage „Mängelliste" und legt automatisch
        einen Vorgang AN „angezeigt" mit der Frist an.
      </p>
    {/snippet}
    {#snippet foot()}
      <button class="btn btn-primary btn-block" onclick={generateRuege} disabled={ruegeProcessing || !ruegeContactId}>
        <Icon name="send" size={14} /> {ruegeProcessing ? 'Generiere…' : 'PDF erzeugen + Vorgang anlegen'}
      </button>
    {/snippet}
  </Sheet>
{/if}

<style>
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 12px; text-decoration: none; }
  .back-link:hover { color: var(--ink); }
  .defect-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .defect-num-tag { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--ink); background: var(--paper-tint); padding: 4px 10px; border-radius: 6px; border: 1px solid var(--line); }
  .plan-crop-section { display: flex; gap: 14px; align-items: center; padding: 10px; margin-bottom: 14px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); text-decoration: none; color: inherit; transition: all .12s; }
  .plan-crop-section:hover { border-color: var(--line-strong); transform: translateX(2px); box-shadow: var(--shadow-1); }
  .plan-crop-img { width: 200px; height: 150px; flex-shrink: 0; border-radius: var(--r-sm); overflow: hidden; background: var(--grey-soft); border: 1px solid var(--line); display: block; position: relative; }
  .plan-crop-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .plan-crop-skeleton { position: absolute; inset: 0; background: linear-gradient(90deg, var(--paper-tint) 0%, var(--grey-soft) 50%, var(--paper-tint) 100%); background-size: 200% 100%; animation: defect-detail-shimmer 1.4s linear infinite; }
  @keyframes defect-detail-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @media (prefers-reduced-motion: reduce) { .plan-crop-skeleton { animation: none; } }
  .plan-crop-meta { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .plan-crop-eyebrow { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); }
  .plan-crop-hint { font-size: 14px; font-weight: 600; color: var(--ink); }
  .plan-crop-cta { font-family: var(--mono); font-size: 11px; color: var(--red); display: inline-flex; align-items: center; gap: 4px; margin-top: 2px; }
  @media (max-width: 640px) {
    .plan-crop-img { width: 120px; height: 90px; }
  }
  .defect-title-input { flex: 1; min-width: 200px; font-family: var(--display); font-weight: 800; font-size: 22px; line-height: 1.1; letter-spacing: -.015em; border: none; padding: 4px 0; background: transparent; }
  .defect-title-input:focus { border-bottom: 2px solid var(--red); outline: none; }
  .status-pill { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; }
  .status-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
  .vorgaenge-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 16px; }
  @media (min-width: 768px) { .vorgaenge-grid { grid-template-columns: 1fr 1fr; } }
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
  .task-link-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; margin-top: 8px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); text-decoration: none; color: inherit; transition: all .12s; min-height: 44px; }
  .task-link-card:hover { border-color: var(--line-strong); box-shadow: var(--shadow-1); }
  .task-link-icon { font-size: 18px; flex-shrink: 0; }
  .task-link-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .task-link-name { font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task-link-date { font-family: var(--mono); font-size: 11px; color: var(--muted); }
  .task-link-arrow { font-size: 14px; color: var(--muted); flex-shrink: 0; }
  .folgewerk-warnung {
    display: flex; align-items: flex-start; gap: 8px;
    margin-top: 8px; padding: 10px 12px;
    background: rgba(217, 119, 6, .08); border: 1px solid rgba(217, 119, 6, .25);
    border-radius: var(--r-md); font-size: 13px; line-height: 1.4;
    color: var(--ink);
  }
  .folgewerk-icon { font-size: 16px; flex-shrink: 0; }
</style>
