<script lang="ts">
  import Icon from './Icon.svelte';
  import { fmtDateDe } from '$lib/util/time';
  import { VORGANG_STATUS_LABEL, VORGANG_STATUS_TINT, type VorgangStatus } from '$lib/db/vorgangTypes';

  type Vorgang = {
    id: string;
    partei: 'AN' | 'AG' | string;
    status: VorgangStatus | string;
    beschreibung: string | null;
    termin: string | null;
    terminAntwort: string | null;
    documentUrl: string | null;
    createdAt: Date | string;
  };

  type Props = {
    partei: 'AN' | 'AG';
    vorgaenge: Vorgang[];
    onAdd?: () => void;
  };
  let { partei, vorgaenge, onAdd }: Props = $props();

  let filtered = $derived(vorgaenge.filter((v) => v.partei === partei));

  function statusLabel(s: string): string {
    return (VORGANG_STATUS_LABEL as Record<string, string>)[s] ?? s;
  }
  function statusTint(s: string): string {
    return (VORGANG_STATUS_TINT as Record<string, string>)[s] ?? 'grey';
  }
  function fmtDt(d: Date | string): string {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
</script>

<div class="vorgang-timeline">
  <div class="vorgang-head">
    <span class="vorgang-eyebrow">{partei === 'AN' ? 'Auftragnehmer' : 'Auftraggeber'}</span>
    <span class="vorgang-count">{filtered.length}</span>
    {#if onAdd}
      <button class="btn btn-ghost btn-sm" onclick={onAdd} type="button">
        <Icon name="plus" size={12} /> Vorgang
      </button>
    {/if}
  </div>

  {#if filtered.length === 0}
    <div class="vorgang-empty">Noch kein Vorgang erfasst.</div>
  {:else}
    <ul class="vorgang-list">
      {#each filtered as v (v.id)}
        <li class="vorgang-item tint-{statusTint(v.status)}">
          <span class="vorgang-dot" aria-hidden="true"></span>
          <div class="vorgang-body">
            <div class="vorgang-line1">
              <span class="vorgang-status status-{statusTint(v.status)}">{statusLabel(v.status)}</span>
              <span class="vorgang-time">{fmtDt(v.createdAt)}</span>
            </div>
            {#if v.beschreibung}
              <div class="vorgang-text">{v.beschreibung}</div>
            {/if}
            <div class="vorgang-meta">
              {#if v.termin}<span>Termin: {fmtDateDe(v.termin)}</span>{/if}
              {#if v.terminAntwort}<span>Antwort bis: {fmtDateDe(v.terminAntwort)}</span>{/if}
              {#if v.documentUrl}
                <a class="vorgang-doc" href={v.documentUrl} target="_blank" rel="noopener">
                  <Icon name="file" size={11} /> Dokument
                </a>
              {/if}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .vorgang-timeline { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-md); padding: 14px; }
  .vorgang-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .vorgang-eyebrow { font-family: var(--mono); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-2); flex: 1; }
  .vorgang-count { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--muted); padding: 2px 7px; background: var(--paper-tint); border-radius: 999px; border: 1px solid var(--line); }
  .vorgang-empty { font-size: 13px; color: var(--muted); text-align: center; padding: 16px 0; }
  .vorgang-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
  .vorgang-item { display: flex; gap: 10px; padding-left: 4px; position: relative; }
  .vorgang-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; background: var(--muted); }
  .vorgang-item.tint-red .vorgang-dot { background: var(--red); }
  .vorgang-item.tint-amber .vorgang-dot { background: var(--amber); }
  .vorgang-item.tint-green .vorgang-dot { background: var(--green); }
  .vorgang-item.tint-blue .vorgang-dot { background: var(--blue); }
  .vorgang-body { flex: 1; min-width: 0; }
  .vorgang-line1 { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .vorgang-status { font-family: var(--mono); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 999px; border: 1px solid var(--line); }
  .vorgang-status.status-red { color: var(--red); background: var(--red-soft); border-color: rgba(227, 6, 19, 0.2); }
  .vorgang-status.status-amber { color: var(--amber); background: var(--amber-soft); border-color: rgba(217, 119, 6, 0.2); }
  .vorgang-status.status-green { color: var(--green); background: var(--green-soft); border-color: rgba(46, 125, 50, 0.2); }
  .vorgang-status.status-blue { color: var(--blue); background: var(--blue-soft); border-color: rgba(59, 108, 196, 0.2); }
  .vorgang-status.status-grey { color: var(--ink-2); background: var(--paper-tint); }
  .vorgang-time { font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .vorgang-text { font-size: 13px; color: var(--ink); margin-top: 4px; line-height: 1.4; }
  .vorgang-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 4px; font-family: var(--mono); font-size: 10px; color: var(--muted); }
  .vorgang-doc { color: var(--blue); display: inline-flex; align-items: center; gap: 3px; text-decoration: none; }
  .vorgang-doc:hover { text-decoration: underline; }
</style>
