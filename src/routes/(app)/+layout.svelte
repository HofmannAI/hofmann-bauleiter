<script lang="ts">
  import Toast from '$lib/components/Toast.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

  let { children } = $props();
</script>

{@render children()}
<Toast />
<CommandPalette />
<ConfirmDialog />
