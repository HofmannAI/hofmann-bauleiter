<script lang="ts" module>
  export type EmptyVariant = 'default' | 'success' | 'info';
</script>

<script lang="ts">
  /**
   * Polished Empty-State (ersetzt das alte „·"-Emoji + grauer Text).
   *
   * - Variant `default`: neutrale grau-getönte Karte
   * - Variant `success`: grüner Tint, geeignet für „Alles erledigt"
   * - Variant `info`: blaue Akzentfarbe, geeignet für Onboarding-Hint
   *
   * Slots: `cta` für eine optionale Action (z.B. „Ersten Mangel anlegen")
   */
  import type { Snippet } from 'svelte';
  import type { IconName } from './Icon.svelte';
  import Icon from './Icon.svelte';

  type Props = {
    title: string;
    description?: string;
    icon?: IconName;
    variant?: EmptyVariant;
    cta?: Snippet;
    compact?: boolean;
  };
  let { title, description, icon = 'check', variant = 'default', cta, compact = false }: Props = $props();
</script>

<div class="empty-state empty-{variant}" class:compact>
  <div class="empty-icon" aria-hidden="true">
    <Icon name={icon} size={compact ? 16 : 22} />
  </div>
  <div class="empty-text-wrap">
    <p class="empty-title">{title}</p>
    {#if description}<p class="empty-description">{description}</p>{/if}
  </div>
  {#if cta}<div class="empty-cta">{@render cta()}</div>{/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 32px 20px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--r-lg, 14px);
    text-align: center;
  }
  .empty-state.compact {
    flex-direction: row;
    padding: 12px 14px;
    gap: 10px;
    text-align: left;
    align-items: center;
  }
  .empty-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--paper-tint);
    color: var(--muted);
    flex-shrink: 0;
  }
  .empty-state.compact .empty-icon { width: 28px; height: 28px; border-radius: 8px; }

  /* Variants */
  .empty-success .empty-icon { background: var(--green-soft); color: var(--green); }
  .empty-info .empty-icon { background: var(--blue-soft); color: var(--blue); }

  .empty-text-wrap { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
  .empty-title {
    margin: 0;
    font-family: var(--display);
    font-weight: 700;
    font-size: 14px;
    color: var(--ink);
  }
  .empty-state.compact .empty-title { font-size: 13px; }
  .empty-description {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
    line-height: 1.4;
  }
  .empty-state.compact .empty-description { font-size: 12px; }
  .empty-cta { margin-top: 4px; }
  .empty-state.compact .empty-cta { margin-top: 0; }
</style>
