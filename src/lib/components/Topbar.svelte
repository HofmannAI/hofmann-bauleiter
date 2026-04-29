<script lang="ts">
  import Icon from './Icon.svelte';

  type Props = { projectName: string; userInitials?: string | null };
  let { projectName, userInitials = null }: Props = $props();

  let menuOpen = $state(false);
</script>

<header class="topbar">
  <div class="topbar-logo" aria-hidden="true"></div>
  <div class="topbar-text">
    <div class="topbar-brand">HOFMANN <span class="hl">HAUS</span></div>
    <div class="topbar-project" title={projectName}>
      <span>{projectName}</span>
      <a class="switch" href="/projects">Wechseln</a>
    </div>
  </div>
  <div class="topbar-actions">
    {#if userInitials}
      <button
        class="icon-btn"
        aria-label="Menü öffnen"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <span style="font-family:var(--display);font-weight:800;font-size:11px">{userInitials}</span>
      </button>
    {:else}
      <button class="icon-btn" aria-label="Menü öffnen" onclick={() => (menuOpen = !menuOpen)}>
        <Icon name="menu" />
      </button>
    {/if}

    {#if menuOpen}
      <div class="menu open" role="menu">
        <a class="menu-item" href="/projects" role="menuitem">
          <Icon name="building" /> Projekte wechseln
        </a>
        <form action="/auth/logout" method="POST" style="display:contents">
          <button class="menu-item danger" type="submit" role="menuitem">
            <Icon name="logout" /> Abmelden
          </button>
        </form>
      </div>
    {/if}
  </div>
</header>

<style>
  .menu {
    position: absolute; top: 100%; right: 0; margin-top: 6px;
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-md); box-shadow: var(--shadow-2);
    min-width: 230px; overflow: hidden; z-index: 60;
  }
  .menu-item {
    display: flex; align-items: center; gap: 10px; width: 100%;
    padding: 11px 14px; text-align: left; font-size: 14px;
    color: var(--ink); border-bottom: 1px solid var(--line);
    text-decoration: none; background: none; border-left: 0; border-right: 0; border-top: 0;
    cursor: pointer; font-family: inherit;
  }
  .menu-item:last-child { border-bottom: none; }
  .menu-item:hover { background: var(--paper-tint); }
  .menu-item.danger { color: var(--red); }
</style>
