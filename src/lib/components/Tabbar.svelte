<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';
  import { page } from '$app/state';

  type Props = { projectId: string };
  let { projectId }: Props = $props();

  type Tab = { href: string; label: string; icon: IconName; match: string };
  const tabs: Tab[] = [
    { href: 'dashboard',    label: 'Übersicht',     icon: 'home',     match: 'dashboard' },
    { href: 'checklisten',  label: 'Checklisten',   icon: 'list',     match: 'checklisten' },
    { href: 'bauzeitenplan',label: 'Bauzeit',       icon: 'gantt',    match: 'bauzeitenplan' },
    { href: 'aufgaben',     label: 'Aufgaben',      icon: 'tasks',    match: 'aufgaben' },
    { href: 'maengel',      label: 'Mängel',        icon: 'defect',   match: 'maengel' },
    { href: 'aktivitaet',   label: 'Aktivität',     icon: 'activity', match: 'aktivitaet' }
  ];

  function isActive(t: Tab): boolean {
    return page.url.pathname.includes(`/${projectId}/${t.match}`);
  }
</script>

<nav class="tabbar" aria-label="Hauptnavigation">
  {#each tabs as t (t.href)}
    <a class="tabbar-btn" class:active={isActive(t)} href={`/${projectId}/${t.href}`}>
      <Icon name={t.icon} />
      <span>{t.label}</span>
    </a>
  {/each}
</nav>
