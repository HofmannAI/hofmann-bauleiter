<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import { invalidateAll } from '$app/navigation';
  import { toast } from '$lib/components/Toast.svelte';
  import { enhance } from '$app/forms';

  let { data } = $props();
  let parent = $derived(data);

  type Status = 'all' | 'open' | 'sent' | 'acknowledged' | 'resolved';
  let statusFilter = $state<Status>('all');
  let gewerkFilter = $state<string>('all');

  let visible = $derived(
    parent.defects.filter((d) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'open' && !['open', 'reopened'].includes(d.status)) return false;
        if (statusFilter === 'sent' && d.status !== 'sent') return false;
        if (statusFilter === 'acknowledged' && d.status !== 'acknowledged') return false;
        if (statusFilter === 'resolved' && !['resolved', 'accepted'].includes(d.status)) return false;
      }
      if (gewerkFilter !== 'all' && d.gewerkId !== gewerkFilter) return false;
      return true;
    })
  );

  let showCreate = $state(false);
  let showBulk = $state(false);
  let bulkText = $state('');
  let bulkGewerkId = $state('');

  const STATUS_LABEL: Record<string, string> = {
    open: 'Offen', sent: 'Gesendet', acknowledged: 'Bestätigt',
    resolved: 'Erledigt', accepted: 'Akzeptiert', rejected: 'Abgelehnt', reopened: 'Wiedereröffnet'
  };
</script>

<div class="page">
  <div class="maengel-header">
    <h2 class="section-title" style="margin:0">Mängel <span class="count">{visible.length}</span></h2>
    <div class="maengel-actions">
      <a class="btn btn-ghost btn-sm" href={`/${parent.project.id}/maengel/plaene`}>
        <Icon name="file" size={14} /> Pläne
      </a>
      <button class="btn btn-ghost btn-sm" onclick={() => (showBulk = true)}>
        <Icon name="list" size={14} /> Aus Protokoll
      </button>
      <button class="btn btn-primary btn-sm" onclick={() => (showCreate = true)}>
        <Icon name="plus" size={14} /> Mangel
      </button>
    </div>
  </div>

  <div class="filter-bar">
    <button class="filter-pill" class:active={statusFilter === 'all'} onclick={() => (statusFilter = 'all')}>Alle</button>
    <button class="filter-pill" class:active={statusFilter === 'open'} onclick={() => (statusFilter = 'open')}>Offen</button>
    <button class="filter-pill" class:active={statusFilter === 'sent'} onclick={() => (statusFilter = 'sent')}>Gesendet</button>
    <button class="filter-pill" class:active={statusFilter === 'acknowledged'} onclick={() => (statusFilter = 'acknowledged')}>Bestätigt</button>
    <button class="filter-pill" class:active={statusFilter === 'resolved'} onclick={() => (statusFilter = 'resolved')}>Erledigt</button>
  </div>

  <div class="filter-bar">
    <button class="filter-pill" class:active={gewerkFilter === 'all'} onclick={() => (gewerkFilter = 'all')}>Alle Gewerke</button>
    {#each parent.gewerke as g (g.id)}
      <button class="filter-pill" class:active={gewerkFilter === g.id} onclick={() => (gewerkFilter = g.id)}>{g.name}</button>
    {/each}
  </div>

  {#if visible.length === 0}
    <div class="empty">
      <div class="empty-emoji">·</div>
      <div class="empty-text">Keine Mängel in diesem Filter.</div>
    </div>
  {:else}
    <div class="defect-list">
      {#each visible as d (d.id)}
        <a class="defect-card" href={`/${parent.project.id}/maengel/${d.id}`}>
          <span class="defect-stripe" style={`background:${d.gewerkColor ?? '#6B6660'}`}></span>
          <span class="defect-body">
            <span class="defect-line1">
              <span class="defect-num">{d.shortId ?? '-'}</span>
              <span class="defect-title">{d.title}</span>
            </span>
            <span class="defect-line2">
              {#if d.gewerkName}<span>{d.gewerkName}</span>{/if}
              {#if d.deadline}<span>· Deadline {fmtDateDe(d.deadline)}</span>{/if}
            </span>
          </span>
          <span class="defect-status status-{d.status}">{STATUS_LABEL[d.status] ?? d.status}</span>
        </a>
      {/each}
    </div>
  {/if}
</div>

{#if showCreate}
  <button class="scrim open" onclick={() => (showCreate = false)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Neuen Mangel anlegen">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Neuer Mangel</div>
        <h3 class="sheet-title">Mangel anlegen</h3>
      </div>
      <button class="sheet-close" onclick={() => (showCreate = false)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <form method="POST" action="?/create" use:enhance class="sheet-body">
      <div class="field">
        <label class="field-label" for="t">Titel</label>
        <input id="t" name="title" class="field-input" required maxlength="160" />
      </div>
      <div class="field">
        <label class="field-label" for="g">Gewerk</label>
        <select id="g" name="gewerkId" class="field-input">
          <option value="">— wählen —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="dl">Deadline</label>
        <input id="dl" name="deadline" type="date" class="field-input" />
      </div>
      <div class="field">
        <label class="field-label" for="pr">Priorität</label>
        <select id="pr" name="priority" class="field-input">
          <option value="2">Normal</option>
          <option value="1">Hoch</option>
          <option value="3">Niedrig</option>
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="d">Beschreibung</label>
        <textarea id="d" name="description" class="field-input" rows="4"></textarea>
      </div>
      <button class="btn btn-primary btn-block" type="submit">Anlegen</button>
    </form>
  </div>
{/if}

{#if showBulk}
  <button class="scrim open" onclick={() => (showBulk = false)} aria-label="Schließen"></button>
  <div class="sheet open" role="dialog" aria-label="Aus Protokoll-Text Mängel extrahieren">
    <div class="sheet-handle"></div>
    <div class="sheet-head">
      <div class="sheet-head-text">
        <div class="sheet-eyebrow">Aus Protokoll-Text</div>
        <h3 class="sheet-title">Mängel extrahieren</h3>
      </div>
      <button class="sheet-close" onclick={() => (showBulk = false)} aria-label="Schließen"><Icon name="close" /></button>
    </div>
    <form
      method="POST"
      action="?/bulkExtract"
      use:enhance={() => async ({ result, update }) => {
        await update();
        if (result.type === 'success') {
          toast(`${(result.data as { count?: number })?.count ?? 0} Mängel angelegt.`);
          showBulk = false;
          await invalidateAll();
        }
      }}
      class="sheet-body"
    >
      <div class="field">
        <span class="field-label">Default-Gewerk (optional)</span>
        <select name="gewerkId" bind:value={bulkGewerkId} class="field-input">
          <option value="">— keins —</option>
          {#each parent.gewerke as g}<option value={g.id}>{g.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label class="field-label" for="t">Eine Zeile = ein Mangel</label>
        <textarea id="t" name="text" bind:value={bulkText} class="field-input" rows="10" placeholder="Mangel 1&#10;Mangel 2&#10;..."></textarea>
      </div>
      <button class="btn btn-primary btn-block" type="submit" disabled={!bulkText.trim()}>Anlegen</button>
    </form>
  </div>
{/if}

<style>
  .maengel-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .maengel-actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .defect-list { display: flex; flex-direction: column; gap: 6px; }
  .defect-card { display: flex; gap: 10px; align-items: center; background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; text-decoration: none; color: inherit; transition: all .12s; }
  .defect-card:hover { border-color: var(--line-strong); transform: translateX(2px); }
  .defect-stripe { width: 4px; align-self: stretch; border-radius: 2px; flex-shrink: 0; }
  .defect-body { flex: 1; min-width: 0; }
  .defect-line1 { display: flex; align-items: baseline; gap: 8px; }
  .defect-num { font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); flex-shrink: 0; }
  .defect-title { font-weight: 600; font-size: 14px; }
  .defect-line2 { font-family: var(--mono); font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; margin-top: 2px; display: flex; gap: 4px; flex-wrap: wrap; }
  .defect-status { font-family: var(--mono); font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 4px 8px; border-radius: 999px; flex-shrink: 0; }
  .status-open, .status-reopened { background: var(--red-soft); color: var(--red); }
  .status-sent, .status-acknowledged { background: var(--amber-soft); color: var(--amber); }
  .status-resolved, .status-accepted { background: var(--green-soft); color: var(--green); }
  .status-rejected { background: var(--grey-soft); color: var(--muted); }
</style>
