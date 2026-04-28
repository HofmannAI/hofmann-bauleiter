<script lang="ts">
  import { onMount } from 'svelte';
  import Topbar from '$lib/components/Topbar.svelte';
  import Tabbar from '$lib/components/Tabbar.svelte';
  import { subscribeRealtime } from '$lib/stores/realtime';

  let { data, children } = $props();

  onMount(() => subscribeRealtime(data.project.id));
</script>

<svelte:head>
  <title>{data.project.name} · Hofmann Bauleiter</title>
</svelte:head>

<Topbar projectName={data.project.name} userInitials={data.profile?.initials} />

<main>
  {@render children()}
</main>

<Tabbar projectId={data.project.id} />
