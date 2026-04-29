<script lang="ts">
  type Props = { rows?: number; height?: number; gap?: number };
  let { rows = 3, height = 48, gap = 8 }: Props = $props();
</script>

<div class="skeleton-list" style:gap={`${gap}px`}>
  {#each Array(rows) as _, i (i)}
    <div class="skeleton-row" style:height={`${height}px`}></div>
  {/each}
</div>

<style>
  .skeleton-list { display: flex; flex-direction: column; }
  .skeleton-row {
    background: linear-gradient(90deg, var(--paper-tint) 0%, var(--grey-soft) 50%, var(--paper-tint) 100%);
    background-size: 200% 100%;
    border-radius: var(--r-md);
    animation: shimmer 1.4s linear infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton-row { animation: none; background: var(--grey-soft); }
  }
</style>
