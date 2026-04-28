<script lang="ts">
  import { enhance } from '$app/forms';

  let { data, form } = $props();
  let submitting = $state(false);
</script>

<svelte:head>
  <title>Anmelden · Hofmann Bauleiter</title>
</svelte:head>

<div class="login-screen">
  <div class="login-hero">
    <div class="picker-logo" aria-hidden="true"></div>
    <div class="picker-brand">HOFMANN <span class="hl">HAUS</span></div>
    <div class="picker-tagline">Bauleiter-Cockpit</div>
  </div>

  <div class="login-card">
    {#if form?.success}
      <h1 class="login-title">Email geprüft</h1>
      <p class="login-text">
        Wir haben dir einen Magic-Link an <b>{form.email}</b> geschickt. Öffne die Mail
        auf deinem Handy und klicke den Link — du landest direkt im Cockpit.
      </p>
      <p class="login-hint">Mail nicht gekommen? Spam-Ordner prüfen oder Adresse korrigieren.</p>
    {:else}
      <h1 class="login-title">Anmelden</h1>
      <p class="login-text">Email-Adresse, du bekommst einen Magic-Link.</p>

      <form
        method="POST"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update({ reset: false });
            submitting = false;
          };
        }}
      >
        <input type="hidden" name="from" value={data.from} />
        <div class="field">
          <label for="email" class="field-label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            class="field-input"
            placeholder="vorname.nachname@hofmann-haus.com"
            required
            autocomplete="email"
            value={form?.email ?? ''}
          />
          {#if form?.error}
            <div class="field-hint" style="color: var(--red)">{form.error}</div>
          {/if}
        </div>
        <button class="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Sende…' : 'Magic-Link senden'}
        </button>
      </form>
    {/if}
  </div>
</div>

<style>
  .login-screen {
    min-height: 100dvh;
    display: flex; flex-direction: column; align-items: center;
    padding: 36px 18px 60px;
  }
  .login-hero { text-align: center; margin-bottom: 28px; }
  .picker-logo {
    width: 64px; height: 64px;
    border: 4px solid var(--red); border-radius: 6px;
    position: relative; margin: 0 auto 16px;
  }
  .picker-logo::after {
    content: ''; position: absolute; right: 6px; bottom: 6px;
    width: 12px; height: 12px; background: var(--red); border-radius: 50%;
  }
  .picker-brand {
    font-family: var(--display); font-weight: 900;
    font-size: 18px; letter-spacing: .08em; text-transform: uppercase;
  }
  .picker-brand .hl { color: var(--red); }
  .picker-tagline {
    font-family: var(--mono); font-size: 11px; color: var(--muted);
    text-transform: uppercase; letter-spacing: .08em; margin-top: 8px;
  }
  .login-card {
    background: var(--paper); border: 1px solid var(--line);
    border-radius: var(--r-xl); padding: 26px 22px;
    box-shadow: var(--shadow-1);
    max-width: 420px; width: 100%;
  }
  .login-title {
    font-family: var(--display); font-weight: 800; font-size: 22px;
    line-height: 1.15; margin: 0 0 8px;
  }
  .login-text { color: var(--muted); margin: 0 0 20px; font-size: 14px; }
  .login-hint { color: var(--muted); font-size: 12px; margin-top: 12px; }
</style>
