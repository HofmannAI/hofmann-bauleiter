<script lang="ts">
  /**
   * Reusable bottom-sheet with frosted-top, drag-to-close, ESC-close.
   * Pass children via the default slot. Title goes in the `head` snippet.
   *
   * Usage:
   *   <Sheet bind:open ariaLabel="Mangel anlegen">
   *     {#snippet head()}<h3 class="sheet-title">Titel</h3>{/snippet}
   *     {#snippet body()}…{/snippet}
   *     {#snippet foot()}…{/snippet}
   *   </Sheet>
   */
  import Icon from './Icon.svelte';
  import { haptic } from '$lib/motion';
  import { onMount } from 'svelte';
  import type { Snippet } from 'svelte';

  type Props = {
    open: boolean;
    ariaLabel?: string;
    eyebrow?: string;
    title?: string;
    head?: Snippet;
    body?: Snippet;
    foot?: Snippet;
    children?: Snippet;
    onClose?: () => void;
  };
  let {
    open = $bindable(),
    ariaLabel = 'Sheet',
    eyebrow,
    title,
    head,
    body,
    foot,
    children,
    onClose
  }: Props = $props();

  let dragY = $state(0);
  let dragging = $state(false);
  let startY = 0;
  let sheetEl: HTMLElement | null = $state(null);

  function close() {
    haptic(6);
    open = false;
    onClose?.();
  }

  function onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true;
    startY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dy = e.clientY - startY;
    dragY = Math.max(0, dy);
  }
  function onPointerUp(_: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    if (dragY > 100) close();
    dragY = 0;
  }

  onMount(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if open}
  <button class="scrim open" onclick={close} aria-label="Schließen"></button>
{/if}
<div
  bind:this={sheetEl}
  class="sheet"
  class:open
  class:dragging
  role="dialog"
  aria-label={ariaLabel}
  aria-modal="true"
  style:transform={dragY > 0 && open ? `translateY(${dragY}px)` : undefined}
>
  <div
    class="sheet-handle-area"
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerUp}
    role="presentation"
  >
    <div class="sheet-handle"></div>
  </div>
  {#if head || title || eyebrow}
    <div class="sheet-head">
      <div class="sheet-head-text">
        {#if eyebrow}<div class="sheet-eyebrow">{eyebrow}</div>{/if}
        {#if title}<h3 class="sheet-title">{title}</h3>{/if}
        {#if head}{@render head()}{/if}
      </div>
      <button class="sheet-close" onclick={close} aria-label="Schließen"><Icon name="close" /></button>
    </div>
  {/if}
  {#if body}
    <div class="sheet-body">{@render body()}</div>
  {:else if children}
    <div class="sheet-body">{@render children()}</div>
  {/if}
  {#if foot}
    <div class="sheet-foot">{@render foot()}</div>
  {/if}
</div>
