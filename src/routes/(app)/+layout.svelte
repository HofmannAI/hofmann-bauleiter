<script lang="ts">
  import Toast from '$lib/components/Toast.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';

  let { children } = $props();
</script>

{@render children()}
<Toast />
<CommandPalette />
