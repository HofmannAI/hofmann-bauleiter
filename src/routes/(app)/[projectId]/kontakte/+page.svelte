<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { confirm } from '$lib/components/ConfirmDialog.svelte';

  let { data } = $props();
  let parent = $derived(data);

  let editing = $state<null | {
    id: string;
    gewerkId: string;
    company: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
  }>(null);

  let search = $state('');

  let visible = $derived(
    parent.contacts.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.contactName ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.gewerkName ?? '').toLowerCase().includes(q)
      );
    })
  );

  function newContact() {
    editing = { id: '', gewerkId: '', company: '', contactName: '', email: '', phone: '', address: '', notes: '' };
  }

  function editContact(c: (typeof parent.contacts)[number]) {
    editing = {
      id: c.projectId === parent.project.id ? c.id : '',
      gewerkId: c.gewerkId ?? '',
      company: c.company ?? '',
      contactName: c.contactName ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      notes: ''
    };
  }

  async function save() {
    if (!editing) return;
    const fd = new FormData();
    for (const [k, v] of Object.entries(editing)) fd.append(k, v);
    const res = await fetch('?/upsert', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Gespeichert.');
      editing = null;
      await invalidateAll();
    } else toast('Fehler.');
  }

  async function del() {
    if (!editing?.id) return;
    if (!(await confirm({ title: 'Kontakt löschen?', confirmLabel: 'Löschen', danger: true }))) return;
    const fd = new FormData();
    fd.append('id', editing.id);
    const res = await fetch('?/delete', { method: 'POST', body: fd });
    if (res.ok) {
      toast('Gelöscht.');
      editing = null;
      await invalidateAll();
    }
  }
</script>

<div class="page">
  <div class="kontakte-header">
    <h2 class="section-title" style="margin:0">Kontakte <span class="count">{visible.length}</span></h2>
    <button class="btn btn-primary btn-sm" onclick={newContact}><Icon name="plus" size={14} /> Neu</button>
  </div>

  <input
    class="field-input"
    placeholder="Suchen (Firma, Name, Gewerk, Email)…"
    bind:value={search}
    style="margin-bottom:14px"
  />

  {#if visible.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Keine Kontakte. Über `data/contacts.csv` + `pnpm seed:contacts` importieren.</div>
    </div>
  {:else}
    <div class="contact-list">
      {#each visible as c (c.id)}
        <button class="contact-card" onclick={() => editContact(c)}>
          <span class="contact-line1">
            <b>{c.company ?? '—'}</b>
            {#if c.gewerkName}<span class="contact-gewerk">{c.gewerkName}</span>{/if}
            {#if c.projectId == null}<span class="contact-global">Global</span>{/if}
          </span>
          <span class="contact-line2">
            {#if c.contactName}<span>{c.contactName}</span>{/if}
            {#if c.email}<span><Icon name="mail" size={11} /> {c.email}</span>{/if}
            {#if c.phone}<span><Icon name="phone" size={11} /> {c.phone}</span>{/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>

{#if editing}
  <button class="scrim open" onclick={() => (editing = null)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Kontakt bearbeiten">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">{editing.id ? 'Bearbeiten' : 'Neu'}</div>
        <h3 class="sheet-title">Handwerker-Kontakt</h3>
      </div>
      <button class="sheet-close" onclick={() => (editing = null)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <div class="sheet-body">
      <div class="field">
        <label class="field-label" for="g">Gewerk</label>
        <select id="g" class="field-input" bind:value={editing.gewerkId}>
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="co">Firma</label>
        <input id="co" class="field-input" bind:value={editing.company} />
      </div>
      <div class="field">
        <label class="field-label" for="cn">Ansprechpartner</label>
        <input id="cn" class="field-input" bind:value={editing.contactName} />
      </div>
      <div class="field-row">
        <div class="field">
          <label class="field-label" for="em">Email</label>
          <input id="em" type="email" class="field-input" bind:value={editing.email} />
        </div>
        <div class="field">
          <label class="field-label" for="ph">Telefon</label>
          <input id="ph" class="field-input" bind:value={editing.phone} />
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="ad">Adresse</label>
        <input id="ad" class="field-input" bind:value={editing.address} />
      </div>
      <div class="field">
        <label class="field-label" for="no">Notizen</label>
        <textarea id="no" class="field-input" rows="3" bind:value={editing.notes}></textarea>
      </div>
    </div>
    <div class="sheet-foot" style="display:flex;gap:8px">
      {#if editing.id}
        <button class="btn btn-danger" onclick={del}><Icon name="delete" size={14} /></button>
      {/if}
      <button class="btn btn-primary" style="flex:1" onclick={save}>Speichern</button>
    </div>
  </div>
{/if}

<style>
  .kontakte-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .contact-list { display: flex; flex-direction: column; gap: 6px; }
  .contact-card { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; cursor: pointer; text-align: left; font-family: inherit; transition: all .12s; width: 100%; }
  .contact-card:hover { border-color: var(--line-strong); }
  .contact-line1 { font-size: 14px; display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
  .contact-gewerk { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--blue); background: var(--blue-soft); padding: 2px 7px; border-radius: 999px; text-transform: uppercase; }
  .contact-global { font-family: var(--mono); font-size: 9px; font-weight: 700; color: var(--muted); border: 1px dashed var(--line-strong); padding: 1px 6px; border-radius: 999px; }
  .contact-line2 { font-family: var(--mono); font-size: 11px; color: var(--muted); display: flex; flex-wrap: wrap; gap: 12px; }
</style>
