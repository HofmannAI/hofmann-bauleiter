<script lang="ts">
  import Topbar from '$lib/components/Topbar.svelte';
  import Tabbar from '$lib/components/Tabbar.svelte';

  let { data, children } = $props();
</script>

<svelte:head>
  <title>{data.project.name} · Hofmann Bauleiter</title>
</svelte:head>

<Topbar projectName={data.project.name} userInitials={data.profile?.initials} />

<main>
  {@render children()}
</main>

<Tabbar projectId={data.project.id} />
