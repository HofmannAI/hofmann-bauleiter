<script lang="ts">
  /** Floating preview-card on the plan-viewer when a pin is tapped. */
  import Icon from './Icon.svelte';
  import { getSignedUrl } from '$lib/storage/photos';
  import { fly } from 'svelte/transition';
  import { ease } from '$lib/motion';

  type Props = {
    defectId: string;
    projectId: string;
    shortId: string | null;
    title: string;
    status: string;
    gewerkColor: string | null;
    photoStoragePath: string | null;
    x: number; // pixel
    y: number; // pixel
    onOpen: () => void;
    onClose: () => void;
    onChangeStatus?: (s: string) => void;
  };
  let { defectId, projectId, shortId, title, status, gewerkColor, photoStoragePath, x, y, onOpen, onClose, onChangeStatus }: Props = $props();

  let imgUrl = $state<string | null>(null);
  let menuOpen = $state(false);
  $effect(() => {
    if (photoStoragePath) {
      getSignedUrl('defect-photos', photoStoragePath, 600).then((u) => (imgUrl = u));
    } else {
      imgUrl = null;
    }
  });

  const STATUS_LABELS: Record<string, string> = {
    open: 'Offen', sent: 'Gesendet', acknowledged: 'Bestätigt',
    resolved: 'Erledigt', accepted: 'Akzeptiert', rejected: 'Abgelehnt', reopened: 'Wiedereröffnet'
  };
</script>

<div
  class="pin-preview"
  style:left={`${x}px`}
  style:top={`${y}px`}
  in:fly|local={{ y: -8, duration: 220, easing: ease.outExpo }}
  role="dialog"
  aria-label="Mangel-Vorschau"
>
  <button class="pin-preview-close" onclick={onClose} aria-label="Schließen">
    <Icon name="close" size={14} />
  </button>
  <div class="pin-preview-inner">
    <span class="pin-preview-stripe" style:background={gewerkColor ?? 'var(--red)'}></span>
    <div class="pin-preview-text">
      <span class="pin-preview-id">{shortId ?? '—'}</span>
      <span class="pin-preview-title">{title}</span>
      <span class="pin-preview-status status-{status}">{STATUS_LABELS[status] ?? status}</span>
    </div>
    {#if imgUrl}
      <button class="pin-preview-img" onclick={onOpen} aria-label="Foto öffnen">
        <img src={imgUrl} alt="Foto" />
      </button>
    {/if}
  </div>
  <div class="pin-preview-actions">
    <button class="btn btn-ghost btn-sm" onclick={onOpen}>
      <Icon name="eye" size={14} /> Details
    </button>
    {#if onChangeStatus}
      <button class="btn btn-ghost btn-sm" onclick={() => (menuOpen = !menuOpen)} aria-label="Status">
        <Icon name="more" size={14} />
      </button>
      {#if menuOpen}
        <div class="pin-preview-menu">
          {#each [['acknowledged', 'Bestätigt'], ['resolved', 'Erledigt'], ['accepted', 'Akzeptiert'], ['rejected', 'Abgelehnt']] as [s, label]}
            <button class="menu-item" onclick={() => { onChangeStatus(s); menuOpen = false; }}>{label}</button>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .pin-preview {
    position: absolute;
    transform: translate(-50%, calc(-100% - 28px));
    background: var(--glass-light);
    -webkit-backdrop-filter: var(--blur-std);
    backdrop-filter: var(--blur-std);
    border: 1px solid var(--line-strong);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-3);
    width: 240px;
    z-index: 30;
    overflow: hidden;
  }
  @supports not (backdrop-filter: blur(1px)) {
    .pin-preview { background: var(--paper); }
  }
  .pin-preview-close {
    position: absolute; top: 6px; right: 6px;
    width: 22px; height: 22px;
    background: rgba(15, 15, 16, .12); color: var(--ink);
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    cursor: pointer; z-index: 1;
  }
  .pin-preview-inner { display: flex; gap: 10px; padding: 10px; align-items: center; }
  .pin-preview-stripe { width: 4px; align-self: stretch; border-radius: 2px; }
  .pin-preview-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .pin-preview-id { font-family: var(--mono); font-size: 10px; font-weight: 700; color: var(--muted); }
  .pin-preview-title { font-family: var(--display); font-weight: 700; font-size: 13px; line-height: 1.2; }
  .pin-preview-status { font-family: var(--mono); font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px; align-self: flex-start; text-transform: uppercase; letter-spacing: .04em; }
  .pin-preview-img { width: 56px; height: 56px; border-radius: 8px; overflow: hidden; padding: 0; border: 1px solid var(--line); flex-shrink: 0; cursor: zoom-in; }
  .pin-preview-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .pin-preview-actions { display: flex; gap: 4px; padding: 6px 10px 10px; position: relative; }
  .pin-preview-menu {
    position: absolute; bottom: 100%; right: 6px; background: var(--paper);
    border: 1px solid var(--line); border-radius: var(--r-md);
    box-shadow: var(--shadow-2); overflow: hidden;
    display: flex; flex-direction: column; min-width: 140px;
    margin-bottom: 4px;
  }
  .menu-item { padding: 8px 12px; text-align: left; font-size: 13px; cursor: pointer; }
  .menu-item:hover { background: var(--paper-tint); }
  .status-open, .status-reopened { background: var(--red-soft); color: var(--red); }
  .status-sent, .status-acknowledged { background: var(--amber-soft); color: var(--amber); }
  .status-resolved, .status-accepted { background: var(--green-soft); color: var(--green); }
  .status-rejected { background: var(--grey-soft); color: var(--muted); }
</style>
