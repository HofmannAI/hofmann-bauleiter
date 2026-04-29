<script lang="ts">
  /**
   * Microphone button that uses Web Speech API to dictate German text
   * into a target field. Falls back gracefully if API is missing.
   */
  import Icon from './Icon.svelte';
  import { toast } from './Toast.svelte';
  import { haptic } from '$lib/motion';

  type Props = {
    onResult: (text: string) => void;
    lang?: string;
  };
  let { onResult, lang = 'de-DE' }: Props = $props();

  let listening = $state(false);
  let supported = $state(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recognition: any = null;

  $effect(() => {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    supported = !!SR;
  });

  function start() {
    if (typeof window === 'undefined') return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast('Spracheingabe vom Browser nicht unterstützt.');
      return;
    }
    recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    let finalText = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onResult(finalText + interim);
    };
    recognition.onerror = () => {
      listening = false;
      toast('Aufnahme abgebrochen.');
    };
    recognition.onend = () => {
      listening = false;
      if (finalText) haptic(15);
    };
    listening = true;
    haptic(10);
    recognition.start();
  }

  function stop() {
    recognition?.stop();
    listening = false;
  }
</script>

{#if supported}
  <button
    class="voice-btn"
    class:listening
    onclick={() => (listening ? stop() : start())}
    aria-label={listening ? 'Aufnahme stoppen' : 'Diktieren'}
    type="button"
  >
    {#if listening}
      <span class="voice-pulse"></span>
      <Icon name="check" size={14} />
    {:else}
      <span class="voice-icon">●</span>
    {/if}
  </button>
{/if}

<style>
  .voice-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: var(--paper-tint); border: 1px solid var(--line-strong);
    display: inline-flex; align-items: center; justify-content: center;
    cursor: pointer; flex-shrink: 0;
    color: var(--muted);
    position: relative;
  }
  .voice-btn:hover { color: var(--red); border-color: var(--red); }
  .voice-btn.listening { background: var(--red); color: #fff; border-color: var(--red); }
  .voice-icon { font-size: 12px; }
  .voice-pulse {
    position: absolute; inset: -3px;
    border-radius: 50%;
    border: 2px solid var(--red);
    animation: voicepulse 1.4s ease-out infinite;
  }
  @keyframes voicepulse {
    0%   { transform: scale(0.7); opacity: 1; }
    100% { transform: scale(1.4); opacity: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .voice-pulse { animation: none; }
  }
</style>
