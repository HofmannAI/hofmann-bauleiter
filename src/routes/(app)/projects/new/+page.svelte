<script lang="ts">
  import { enhance } from '$app/forms';
  import Icon from '$lib/components/Icon.svelte';

  let { form } = $props();
  let template = $state<'empty' | 'sample'>('empty');
  let name = $state('');
  let an = $state('Hofmann Haus');
  let houseCount = $state(1);
  let aptCounts = $state<number[]>([1]);
  let submitting = $state(false);

  function setHouseCount(n: number) {
    n = Math.max(1, Math.min(10, n));
    if (n > aptCounts.length) {
      aptCounts = [...aptCounts, ...Array(n - aptCounts.length).fill(1)];
    } else {
      aptCounts = aptCounts.slice(0, n);
    }
    houseCount = n;
  }

  function setAptCount(i: number, n: number) {
    n = Math.max(0, Math.min(40, n));
    aptCounts = aptCounts.map((v, idx) => (idx === i ? n : v));
  }
</script>

<svelte:head><title>Neues Projekt · Hofmann Bauleiter</title></svelte:head>

<div class="setup-screen">
  <div class="setup-back">
    <a href="/projects" style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);text-decoration:none">
      <Icon name="back" size={12} /> Zurück
    </a>
  </div>

  <div class="setup-card">
    <h1 class="setup-title">Neues Projekt</h1>
    <p class="setup-subtitle">Vorlage wählen und Häuser konfigurieren.</p>

    <form
      method="POST"
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          await update();
          submitting = false;
        };
      }}
    >
      <div class="setup-template-row">
        <label class="setup-template" class:active={template === 'empty'}>
          <input type="radio" name="template" value="empty" bind:group={template} hidden />
          <div class="setup-template-title">Leeres Projekt</div>
          <div class="setup-template-sub">Häuser + Wohnungen selbst anlegen</div>
        </label>
        <label class="setup-template" class:active={template === 'sample'}>
          <input type="radio" name="template" value="sample" bind:group={template} hidden />
          <div class="setup-template-title">Gaisbach 13</div>
          <div class="setup-template-sub">2 Häuser · 16 Wohnungen · 150 Termine</div>
        </label>
      </div>

      <div class="field">
        <label for="name" class="field-label">Projekt-Name</label>
        <input id="name" name="name" class="field-input" placeholder="z.B. Gaisbach 13" required bind:value={name} />
      </div>

      <div class="field">
        <label for="an" class="field-label">Ausführendes Unternehmen</label>
        <input id="an" name="an" class="field-input" bind:value={an} />
      </div>

      {#if template === 'empty'}
        <div class="field">
          <span class="field-label">Anzahl Häuser</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" onclick={() => setHouseCount(houseCount - 1)} disabled={houseCount <= 1}>−</button>
            <span class="stepper-value">{houseCount}</span>
            <button type="button" class="stepper-btn" onclick={() => setHouseCount(houseCount + 1)} disabled={houseCount >= 10}>+</button>
          </div>
        </div>

        <div class="field">
          <span class="field-label">Wohnungen pro Haus</span>
          <div class="houses-config">
            {#each aptCounts as count, i (i)}
              <div class="house-config">
                <span class="house-config-label">Haus {i + 1}</span>
                <input type="hidden" name={`house_${i}_name`} value={`Haus ${i + 1}`} />
                <input type="hidden" name={`house_${i}_apts`} value={count} />
                <div class="stepper">
                  <button type="button" class="stepper-btn" onclick={() => setAptCount(i, count - 1)} disabled={count <= 0}>−</button>
                  <span class="stepper-value">{count}</span>
                  <button type="button" class="stepper-btn" onclick={() => setAptCount(i, count + 1)} disabled={count >= 40}>+</button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <input type="hidden" name="house_0_name" value="Haus A" />
        <input type="hidden" name="house_0_apts" value="8" />
        <input type="hidden" name="house_1_name" value="Haus B" />
        <input type="hidden" name="house_1_apts" value="8" />
        <p class="field-hint" style="background:var(--paper-tint);padding:10px;border-radius:8px;margin:14px 0">
          Beim Speichern werden Haus A + Haus B mit je 8 Wohnungen sowie alle 150 Bauzeiten-Termine geladen.
        </p>
      {/if}

      {#if form?.error}
        <div class="field-hint" style="color:var(--red);margin-bottom:12px">{form.error}</div>
      {/if}

      <button class="btn btn-primary btn-block" disabled={submitting || !name}>
        {submitting ? 'Anlegen…' : 'Projekt anlegen'}
      </button>
    </form>
  </div>
</div>

<style>
  .setup-screen { min-height: 100dvh; background: var(--bg); padding: 30px 18px 60px; }
  .setup-back { max-width: 540px; margin: 0 auto 16px; display: flex; }
  .setup-card { background: var(--paper); border: 1px solid var(--line); border-radius: var(--r-xl); padding: 24px 22px; box-shadow: var(--shadow-1); max-width: 540px; margin: 0 auto; width: 100%; }
  .setup-title { font-family: var(--display); font-weight: 800; font-size: 22px; line-height: 1.15; letter-spacing: -.01em; margin: 0 0 6px; }
  .setup-subtitle { color: var(--muted); font-size: 14px; margin: 0 0 22px; }
  .setup-template-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 22px; }
  .setup-template {
    padding: 14px; border: 2px solid var(--line); background: var(--paper-tint);
    border-radius: var(--r-md); text-align: left; transition: all .15s; cursor: pointer; display: block;
  }
  .setup-template:hover { border-color: var(--red); }
  .setup-template.active { border-color: var(--red); background: var(--red-soft); }
  .setup-template-title { font-family: var(--display); font-weight: 700; font-size: 14px; margin-bottom: 4px; }
  .setup-template-sub { font-size: 11px; color: var(--muted); font-family: var(--mono); text-transform: uppercase; letter-spacing: .04em; line-height: 1.4; }
  .houses-config { display: flex; flex-direction: column; gap: 8px; margin-top: 6px; }
  .house-config { background: var(--paper-tint); border: 1px solid var(--line); border-radius: var(--r-md); padding: 10px 12px; display: flex; align-items: center; gap: 12px; }
  .house-config-label { font-family: var(--mono); font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--ink); flex: 1; }
  .house-config :global(.stepper) { padding: 2px; }
  .house-config :global(.stepper-btn) { width: 28px; height: 28px; font-size: 15px; }
  .house-config :global(.stepper-value) { font-size: 15px; min-width: 32px; }
</style>
