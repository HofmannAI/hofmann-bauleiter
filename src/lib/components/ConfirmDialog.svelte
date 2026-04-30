<script lang="ts" module>
  type Resolver = (ok: boolean) => void;
  type Opts = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
  };

  let setOpen: ((opts: Opts, resolve: Resolver) => void) | null = null;

  /**
   * Imperative confirm dialog. Returns Promise<boolean>.
   * Replaces window.confirm() with a Sheet-based, mobile-friendly dialog.
   *
   *   if (!(await confirm({ title: 'Foto löschen?', danger: true }))) return;
   */
  export function confirm(opts: Opts): Promise<boolean> {
    return new Promise((resolve) => {
      if (setOpen) setOpen(opts, resolve);
      else resolve(window.confirm(opts.title));
    });
  }
</script>

<script lang="ts">
  import Sheet from './Sheet.svelte';
  import { haptic } from '$lib/motion';

  let open = $state(false);
  let title = $state('');
  let description = $state<string | undefined>(undefined);
  let confirmLabel = $state('OK');
  let cancelLabel = $state('Abbrechen');
  let danger = $state(false);
  let pending = $state<Resolver | null>(null);

  setOpen = (opts, resolve) => {
    title = opts.title;
    description = opts.description;
    confirmLabel = opts.confirmLabel ?? 'OK';
    cancelLabel = opts.cancelLabel ?? 'Abbrechen';
    danger = opts.danger ?? false;
    pending = resolve;
    open = true;
  };

  function settle(ok: boolean) {
    pending?.(ok);
    pending = null;
    open = false;
    if (ok) haptic(10);
  }

  function onClose() {
    if (pending) settle(false);
  }
</script>

<Sheet bind:open ariaLabel={title} {onClose}>
  {#snippet head()}
    <h3 class="sheet-title">{title}</h3>
    {#if description}<p class="confirm-desc">{description}</p>{/if}
  {/snippet}
  {#snippet foot()}
    <div class="confirm-actions">
      <button type="button" class="btn btn-ghost" onclick={() => settle(false)}>{cancelLabel}</button>
      <button
        type="button"
        class="btn"
        class:btn-danger={danger}
        class:btn-primary={!danger}
        onclick={() => settle(true)}
      >{confirmLabel}</button>
    </div>
  {/snippet}
</Sheet>

<style>
  .confirm-desc {
    font-size: 14px;
    color: var(--ink-2);
    margin: 4px 0 0;
    line-height: 1.4;
  }
  .confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    padding: 4px 0;
  }
  .confirm-actions .btn { min-width: 96px; min-height: 44px; }
</style>
