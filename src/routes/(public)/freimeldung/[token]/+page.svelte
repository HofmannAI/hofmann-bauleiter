<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let name = $state('');
  let note = $state('');
  let submitted = $state(false);

  $effect(() => {
    if (form?.ok) submitted = true;
  });
</script>

<svelte:head><title>Freimeldung · Hofmann Haus</title></svelte:head>

<div class="fm-page">
  <div class="fm-card">
    <div class="fm-logo">
      <div class="fm-logo-box"></div>
      <span class="fm-brand">HOFMANN <span class="hl">HAUS</span></span>
    </div>

    {#if data.error}
      <div class="fm-error">
        <h2>Freimeldung</h2>
        <p>{data.error}</p>
      </div>
    {:else if submitted}
      <div class="fm-success">
        <h2>Vielen Dank!</h2>
        <p>Ihre Freimeldung wurde erfolgreich übermittelt. Der Bauleiter wird informiert.</p>
      </div>
    {:else}
      <h2 class="fm-title">Termin-Freimeldung</h2>
      <p class="fm-project">{data.project?.name ?? 'Projekt'}</p>

      <div class="fm-task">
        <span class="fm-task-name">{data.task?.name ?? 'Termin'}</span>
        <span class="fm-task-dates">{data.task?.startDate} – {data.task?.endDate}</span>
      </div>

      <p class="fm-desc">
        Bitte bestätigen Sie die Fertigstellung der oben genannten Arbeiten.
      </p>

      <form method="POST" action="?/submit" use:enhance>
        <div class="fm-field">
          <label for="fm-name">Ihr Name / Firma *</label>
          <input id="fm-name" name="name" required bind:value={name} placeholder="Max Mustermann GmbH" />
        </div>
        <div class="fm-field">
          <label for="fm-note">Anmerkung (optional)</label>
          <textarea id="fm-note" name="note" rows="3" bind:value={note} placeholder="z.B. Restarbeiten am Dienstag"></textarea>
        </div>
        {#if form?.error}
          <p class="fm-form-error">{form.error}</p>
        {/if}
        <button type="submit" class="fm-submit" disabled={!name.trim()}>
          Fertigstellung bestätigen
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .fm-page { min-height: 100dvh; background: #f4f4f8; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .fm-card { background: #fff; border-radius: 16px; padding: 32px; max-width: 420px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .fm-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .fm-logo-box { width: 28px; height: 28px; border: 3px solid #E2162A; border-radius: 4px; position: relative; }
  .fm-logo-box::after { content: ''; position: absolute; right: 3px; bottom: 3px; width: 5px; height: 5px; background: #E2162A; border-radius: 50%; }
  .fm-brand { font-weight: 800; font-size: 14px; letter-spacing: 0.05em; text-transform: uppercase; }
  .fm-brand .hl { color: #E2162A; }
  .fm-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .fm-project { font-size: 14px; color: #666; margin: 0 0 20px; }
  .fm-task { background: #f8f8fc; border: 1px solid #e8e8ed; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
  .fm-task-name { display: block; font-weight: 600; font-size: 15px; margin-bottom: 4px; }
  .fm-task-dates { font-size: 13px; color: #888; }
  .fm-desc { font-size: 14px; color: #555; margin-bottom: 20px; line-height: 1.5; }
  .fm-field { margin-bottom: 16px; }
  .fm-field label { display: block; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06px; color: #888; margin-bottom: 4px; }
  .fm-field input, .fm-field textarea { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; font-family: inherit; }
  .fm-field input:focus, .fm-field textarea:focus { border-color: #E2162A; outline: none; }
  .fm-submit { width: 100%; padding: 14px; background: #E2162A; color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
  .fm-submit:hover { background: #B7001C; }
  .fm-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .fm-error, .fm-success { text-align: center; padding: 20px 0; }
  .fm-error h2, .fm-success h2 { font-size: 18px; margin: 0 0 8px; }
  .fm-success h2 { color: #2E7D32; }
  .fm-error p, .fm-success p { font-size: 14px; color: #666; }
  .fm-form-error { color: #E2162A; font-size: 13px; margin-bottom: 12px; }
</style>
