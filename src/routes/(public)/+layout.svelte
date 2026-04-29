<script lang="ts">
  let { children } = $props();
</script>

<style>
  .public-shell { min-height: 100dvh; background: var(--bg); }
</style>

<div class="public-shell">
  {@render children()}
</div>
