<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { enhance } from '$app/forms';
  import { toast } from '$lib/components/Toast.svelte';

  let { data, form } = $props();

  let deleteTarget = $state<{ id: string; name: string } | null>(null);
  let password = $state('');
  let deleting = $state(false);
  let error = $state('');

  function openDeleteDialog(id: string, name: string, e: Event) {
    e.preventDefault();
    e.stopPropagation();
    deleteTarget = { id, name };
    password = '';
    error = '';
  }

  function closeDeleteDialog() {
    deleteTarget = null;
    password = '';
    error = '';
    deleting = false;
  }

  $effect(() => {
    if (form?.error) {
      error = form.error;
      deleting = false;
    }
    if (form?.deleted) {
      toast('Projekt gelöscht.');
      closeDeleteDialog();
    }
  });
</script>

<svelte:head><title>Projekte · Hofmann Bauleiter</title></svelte:head>

<div class="picker-screen">
  <div class="picker-hero">
    <div class="picker-logo" aria-hidden="true"></div>
    <div class="picker-brand">HOFMANN <span class="hl">HAUS</span></div>
    <div class="picker-tagline">Bauleiter-Cockpit</div>
  </div>

  <div class="picker-section-title">Projekte</div>

  <div class="project-list">
    {#each data.projects as p (p.id)}
      <a class="project-card" href={`/${p.id}/dashboard`}>
        <span class="project-card-icon"><Icon name="building" size={22} /></span>
        <span class="project-card-text">
          <span class="project-card-name">{p.name}</span>
          <span class="project-card-meta">
            <span><b>{p.houseCount}</b> {p.houseCount === 1 ? 'Haus' : 'Häuser'}</span>
            <span><b>{p.apartmentCount}</b> {p.apartmentCount === 1 ? 'Wohnung' : 'Wohnungen'}</span>
            {#if p.taskCount > 0}<span><b>{p.taskCount}</b> Termine</span>{/if}
          </span>
        </span>
        <button
          type="button"
          class="project-delete-btn"
          title="Projekt löschen"
          onclick={(e) => openDeleteDialog(p.id, p.name, e)}
        >
          <Icon name="delete" size={16} />
        </button>
      </a>
    {/each}

    <a class="picker-add" href="/projects/new">
      <Icon name="plus" size={18} />
      <span>Neues Projekt</span>
    </a>

    {#if data.projects.length === 0}
      <p class="empty-text" style="margin-top:12px">Noch kein Projekt. Lege das erste an.</p>
    {/if}
  </div>

  <form action="/auth/logout" method="POST" style="text-align:center;margin-top:32px">
    <button class="btn btn-ghost btn-sm" type="submit"><Icon name="logout" size={14} /> Abmelden</button>
  </form>
</div>

<!-- Delete Confirmation Dialog -->
{#if deleteTarget}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="dialog open" onclick={closeDeleteDialog} onkeydown={(e) => e.key === 'Escape' && closeDeleteDialog()}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="dialog-panel" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Projekt löschen">
      <h3 class="dialog-title">Projekt löschen</h3>
      <p class="dialog-text">
        <b>{deleteTarget.name}</b> wird unwiderruflich gelöscht — inklusive aller Häuser, Termine, Mängel und Fotos.
      </p>

      <form
        method="POST"
        action="?/delete"
        use:enhance={() => {
          deleting = true;
          error = '';
          return async ({ update }) => {
            await update();
          };
        }}
      >
        <input type="hidden" name="projectId" value={deleteTarget.id} />

        <div class="field">
          <label class="field-label" for="delete-password">Passwort zur Bestätigung</label>
          <input
            id="delete-password"
            class="field-input"
            type="password"
            name="password"
            placeholder="Passwort eingeben"
            autocomplete="off"
            bind:value={password}
          />
          {#if error}
            <p class="field-error">{error}</p>
          {/if}
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn btn-ghost" onclick={closeDeleteDialog}>Abbrechen</button>
          <button type="submit" class="btn btn-danger" disabled={!password || deleting}>
            {#if deleting}Löscht…{:else}Endgültig löschen{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .picker-screen { min-height: 100dvh; background: var(--bg); padding: 36px 18px 60px; }
  .picker-hero { text-align: center; margin-bottom: 28px; }
  .picker-logo { width: 64px; height: 64px; border: 4px solid var(--red); border-radius: 6px; position: relative; margin: 0 auto 16px; }
  .picker-logo::after { content: ''; position: absolute; right: 6px; bottom: 6px; width: 12px; height: 12px; background: var(--red); border-radius: 50%; }
  .picker-brand { font-family: var(--display); font-weight: 900; font-size: 18px; letter-spacing: .08em; text-transform: uppercase; }
  .picker-brand .hl { color: var(--red); }
  .picker-tagline { font-family: var(--mono); font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; margin-top: 8px; }
  .picker-section-title { font-family: var(--display); font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 24px auto 12px; padding: 0 4px; max-width: 540px; }
  .project-list { max-width: 540px; margin: 0 auto; display: flex; flex-direction: column; gap: 10px; }
  .project-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-lg); padding: 16px 18px;
    display: flex; align-items: center; gap: 14px;
    text-align: left; width: 100%;
    color: inherit; text-decoration: none;
    box-shadow: var(--shadow-1); transition: all .15s; cursor: pointer;
    position: relative;
  }
  .project-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-2); border-color: var(--ink); }
  .project-card-icon { flex-shrink: 0; width: 46px; height: 46px; border-radius: 10px; background: var(--red-soft); color: var(--red); display: flex; align-items: center; justify-content: center; }
  .project-card-text { flex: 1; min-width: 0; }
  .project-card-name { font-family: var(--display); font-weight: 700; font-size: 16px; letter-spacing: -.01em; line-height: 1.2; margin-bottom: 4px; display: block; }
  .project-card-meta { font-family: var(--mono); font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; display: flex; flex-wrap: wrap; gap: 4px 10px; }
  .project-card-meta b { color: var(--ink-2); font-weight: 700; }
  .project-delete-btn {
    flex-shrink: 0; width: 44px; height: 44px;
    display: flex; align-items: center; justify-content: center;
    border-radius: var(--r-DEFAULT); color: var(--muted);
    opacity: 0; transition: all var(--d-fast) var(--ease-out-expo);
  }
  .project-card:hover .project-delete-btn { opacity: 1; }
  .project-delete-btn:hover { color: var(--error); background: var(--error-container); }
  @media (hover: none) {
    .project-delete-btn { opacity: 0.6; }
  }
  .picker-add {
    background: var(--paper); border: 2px dashed var(--line-strong);
    border-radius: var(--r-lg); padding: 16px;
    display: flex; align-items: center; gap: 12px; justify-content: center;
    width: 100%; color: var(--muted); font-weight: 600; font-size: 14px;
    text-decoration: none; transition: all .15s;
  }
  .picker-add:hover { border-color: var(--red); color: var(--red); background: var(--red-soft); }
  .field-error {
    font-size: 13px; color: var(--error); margin-top: var(--stack-sm);
    font-weight: 500;
  }
</style>
