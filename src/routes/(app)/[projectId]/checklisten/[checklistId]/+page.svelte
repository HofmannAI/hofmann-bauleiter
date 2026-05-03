<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { invalidate, goto } from '$app/navigation';
  import { uploadChecklistPhoto, getSignedUrl } from '$lib/storage/photos';
  import { toast } from '$lib/components/Toast.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let houseFilter = $state<string>('all');

  type SheetState = {
    itemId: string;
    itemText: string;
    scopeKey: string;
    scopeLabel: string;
    done: boolean;
    doneDate: string | null;
    notes: string | null;
    photoIds: string[];
  };
  let sheet = $state<SheetState | null>(null);
  let savingPhoto = $state(false);

  function progressFor(itemId: string, scopeKey: string) {
    return parent.progress[`${itemId}|${scopeKey}`] ?? null;
  }

  function visibleInstances() {
    if (houseFilter === 'all' || parent.checklist.scope === 'project') return parent.instances;
    return parent.instances.filter((i) => i.houseId === houseFilter);
  }

  let houseSet = $derived(
    Array.from(
      new Map(
        parent.instances
          .filter((i) => i.houseId)
          .map((i) => [i.houseId!, parent.houses.find((h) => h.id === i.houseId)?.name ?? i.label])
      )
    ).map(([id, name]) => ({ id, name }))
  );

  function openSheet(itemId: string, itemText: string, instKey: string, instLabel: string) {
    const p = progressFor(itemId, instKey);
    sheet = {
      itemId,
      itemText,
      scopeKey: instKey,
      scopeLabel: instLabel,
      done: p?.done ?? false,
      doneDate: p?.doneDate ?? null,
      notes: p?.notes ?? null,
      photoIds: p?.photoIds ?? []
    };
  }
  function closeSheet() { sheet = null; }

  async function postForm(action: string, fields: Record<string, string | number | boolean>) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));
    const res = await fetch(`?/${action}`, { method: 'POST', body: fd });
    if (!res.ok) toast('Fehler beim Speichern.');
    return res.ok;
  }

  async function toggle() {
    if (!sheet) return;
    const next = !sheet.done;
    const ok = await postForm('toggle', { itemId: sheet.itemId, scopeKey: sheet.scopeKey, done: next });
    if (ok) {
      sheet.done = next;
      await invalidate(`app:checklist:${parent.checklist.id}`);
      await invalidate(() => true);
    }
  }

  async function saveFields() {
    if (!sheet) return;
    await postForm('saveFields', {
      itemId: sheet.itemId,
      scopeKey: sheet.scopeKey,
      notes: sheet.notes ?? '',
      date: sheet.doneDate ?? ''
    });
    toast('Gespeichert.');
    await invalidate(() => true);
  }

  async function onPhotoFiles(files: FileList | null) {
    if (!files || !sheet) return;
    savingPhoto = true;
    try {
      // Need a progress row first — saveFields with current state ensures one
      await postForm('saveFields', {
        itemId: sheet.itemId,
        scopeKey: sheet.scopeKey,
        notes: sheet.notes ?? '',
        date: sheet.doneDate ?? ''
      });
      await invalidate(() => true);
      const pr = progressFor(sheet.itemId, sheet.scopeKey);
      if (!pr) { toast('Fortschritt-Zeile fehlt.'); return; }

      for (const f of Array.from(files)) {
        const { path, width, height } = await uploadChecklistPhoto(parent.project.id, pr.id, f);
        await postForm('linkPhoto', {
          itemId: sheet.itemId,
          scopeKey: sheet.scopeKey,
          storagePath: path,
          width,
          height
        });
      }
      toast('Fotos hochgeladen.');
      await invalidate(() => true);
    } catch (e) {
      console.error(e);
      toast('Foto-Upload fehlgeschlagen.');
    } finally {
      savingPhoto = false;
    }
  }
</script>

<div class="page">
  <div class="detail-header">
    <a class="back-link" href={`/${parent.project.id}/checklisten`}>
      <Icon name="back" size={12} /> Zurück
    </a>
    <div class="detail-num-row">
      <span class="checklist-num">{parent.checklist.num}</span>
      <h1 class="detail-title" style="margin:0">{parent.checklist.title}</h1>
    </div>
  </div>

  {#if parent.checklist.scope !== 'project' && houseSet.length > 1}
    <div class="filter-houses">
      <button class="house-chip" class:active={houseFilter === 'all'} onclick={() => (houseFilter = 'all')}>Alle</button>
      {#each houseSet as h (h.id)}
        <button class="house-chip" class:active={houseFilter === h.id} onclick={() => (houseFilter = h.id)}>{h.name}</button>
      {/each}
    </div>
  {/if}

  {#each parent.sections as sec (sec.id)}
    {@const sectionItems = parent.items.filter((it) => it.sectionId === sec.id)}
    <div class="section-block">
      {#if sec.title}<h3 class="section-heading">{sec.title}</h3>{/if}
      {#each sectionItems as it (it.id)}
        <div class="item-card">
          <div class="item-card-text">{it.text}</div>
          <div class="pills-grid">
            {#each visibleInstances() as inst (inst.key)}
              {@const p = progressFor(it.id, inst.key)}
              <button
                class="pill"
                class:done={p?.done}
                onclick={() => openSheet(it.id, it.text, inst.key, inst.label)}
                title={inst.label}
              >
                <span class="pill-dot"></span>
                <span>{inst.short}</span>
                {#if (p?.photoIds.length ?? 0) > 0}
                  <span class="pill-cam"><Icon name="photo" size={11} /> {p?.photoIds.length}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>

{#if sheet}
  <button class="scrim open" onclick={closeSheet} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Checklist-Item bearbeiten">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">{sheet.scopeLabel}</div>
        <h3 class="sheet-title">Checkliste · Item</h3>
      </div>
      <button class="sheet-close" onclick={closeSheet} aria-label="Schließen"><Icon name="close" size={18} /></button>
    </div>
    <div class="sheet-body">
      <div class="sheet-item-text">{sheet.itemText}</div>

      <button class="sheet-status-toggle" class:checked={sheet.done} onclick={toggle}>
        <span class="check-box"><Icon name="check" size={14} /></span>
        <span>
          <div class="sheet-status-text">{sheet.done ? 'Erledigt' : 'Offen'}</div>
          <div class="sheet-status-sub">{sheet.done ? 'Zum Zurücksetzen tippen' : 'Zum Abhaken tippen'}</div>
        </span>
      </button>

      <div class="field">
        <label class="field-label" for="sh-date">Datum</label>
        <input id="sh-date" type="date" class="field-input" bind:value={sheet.doneDate} onblur={saveFields} />
      </div>

      <div class="field">
        <label class="field-label" for="sh-notes">Notiz</label>
        <textarea id="sh-notes" class="field-input" rows="3" bind:value={sheet.notes} onblur={saveFields}></textarea>
      </div>

      <div class="photos-section">
        <div class="field-label">Fotos ({sheet.photoIds.length})</div>
        <div class="photos-grid">
          <label class="photo-add-tile">
            <Icon name="photo" size={22} />
            <span>{savingPhoto ? 'Lädt…' : 'Foto'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onchange={(e) => onPhotoFiles((e.currentTarget as HTMLInputElement).files)}
            />
          </label>
        </div>
      </div>
    </div>
    <div class="sheet-foot">
      <button class="btn btn-ghost btn-block" onclick={closeSheet}>Schließen</button>
    </div>
  </div>
{/if}

<style>
  .detail-header { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 16px; margin-bottom: 12px; box-shadow: var(--shadow-1); }
  .back-link { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); padding: 0; margin-bottom: 8px; text-decoration: none; }
  .back-link:hover { color: var(--ink); }
  .detail-num-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
  .detail-title { font-family: var(--display); font-weight: 800; font-size: 22px; line-height: 1.1; letter-spacing: -.015em; }
  .checklist-num { flex-shrink: 0; width: 30px; height: 30px; background: var(--ink); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-family: var(--display); font-weight: 800; font-size: 13px; }
  .filter-houses { display: flex; gap: 6px; overflow-x: auto; margin: 4px 0 14px; padding: 2px 0; scrollbar-width: none; }
  .filter-houses::-webkit-scrollbar { display: none; }
  .house-chip { padding: 6px 12px; min-height: 36px; background: var(--surface-container-low); border: 1px solid var(--outline-variant); border-radius: 9999px; font-size: 12px; line-height: 16px; font-weight: 500; letter-spacing: 0.06px; text-transform: uppercase; color: var(--secondary); white-space: nowrap; transition: all var(--d-fast) var(--ease-out-expo); cursor: pointer; display: inline-flex; align-items: center; }
  .house-chip.active { background: var(--inverse-surface); color: var(--inverse-on-surface); border-color: var(--inverse-surface); }
  .section-block { margin-bottom: 16px; }
  .section-heading { font-family: var(--display); font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 0 0 8px; padding: 0 4px; }
  .item-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-lg); padding: 14px 16px; margin-bottom: 8px; transition: all .15s; box-shadow: var(--shadow-1); }
  .item-card:hover { border-color: var(--line-strong); }
  .item-card-text { font-size: 14px; line-height: 1.45; color: var(--ink); margin-bottom: 10px; }
  .pills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 11px; background: var(--grey-soft);
    border: 1px solid transparent; border-radius: 999px;
    font-family: var(--mono); font-size: 12px; font-weight: 700;
    color: var(--ink-2); transition: all .15s; line-height: 1; min-height: 30px;
    cursor: pointer;
  }
  .pill:hover { transform: translateY(-1px); box-shadow: var(--shadow-1); }
  .pill.done { background: var(--green-soft); color: var(--green); border-color: rgba(46, 125, 50, .2); }
  .pill .pill-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--grey); }
  .pill.done .pill-dot { background: var(--green); }
  .pill .pill-cam { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; opacity: .85; }

  .sheet-item-text { font-size: 14px; line-height: 1.5; color: var(--ink-2); background: var(--paper-tint); padding: 11px 13px; border-radius: var(--r-md); border-left: 3px solid var(--red); margin-bottom: 16px; }
  .sheet-status-toggle { display: flex; align-items: center; gap: 12px; padding: 13px; background: var(--paper-tint); border: 2px solid var(--line); border-radius: var(--r-md); margin-bottom: 14px; cursor: pointer; transition: all .15s; user-select: none; width: 100%; text-align: left; font-family: inherit; }
  .sheet-status-toggle.checked { background: var(--green-soft); border-color: var(--green); }
  .check-box { width: 24px; height: 24px; border: 2px solid var(--line-strong); border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; background: var(--paper); }
  .sheet-status-toggle.checked .check-box { background: var(--green); border-color: var(--green); color: #fff; }
  .sheet-status-text { font-family: var(--display); font-weight: 700; font-size: 15px; }
  .sheet-status-sub { font-size: 12px; color: var(--muted); margin-top: 2px; font-family: var(--mono); text-transform: uppercase; letter-spacing: .04em; }

  .photos-section { margin-bottom: 14px; }
  .photos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); gap: 8px; }
  .photo-add-tile { aspect-ratio: 1; border: 2px dashed var(--line-strong); border-radius: var(--r-md); background: var(--paper-tint); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--muted); transition: all .15s; cursor: pointer; }
  .photo-add-tile:hover { border-color: var(--red); color: var(--red); background: var(--red-soft); }
  .photo-add-tile span { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
</style>
