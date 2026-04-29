/**
 * Motion primitives — Spring-feeling transitions for Svelte.
 * Prefers reduced-motion is respected via the `respectReducedMotion` flag.
 */
import { cubicOut, expoOut, quintOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Easing curves (matching docs/UX_AUDIT.md §0) ---------- */
export const ease = {
  outExpo: expoOut,
  outQuint: quintOut,
  outCubic: cubicOut,
  spring: (t: number) => {
    // Apple-ish damped spring: starts fast, overshoots subtly then settles
    return 1 - Math.exp(-6 * t) * Math.cos(8 * t);
  }
} as const;

/* ---------- Durations ---------- */
export const dur = {
  micro: 120,
  fast: 180,
  std: 220,
  page: 400
} as const;

/* ---------- Slide-up transition (sheets) ---------- */
export function sheetIn(node: HTMLElement, params: { duration?: number } = {}): TransitionConfig {
  const d = reducedMotion() ? dur.fast : params.duration ?? 320;
  return {
    duration: d,
    easing: ease.outExpo,
    css: (t) => {
      const offset = (1 - t) * 100;
      return `transform: translateY(${offset}%); opacity: ${0.6 + t * 0.4};`;
    }
  };
}

/* ---------- Scale-fade (cards, dialogs, lightbox) ---------- */
export function pop(node: HTMLElement, params: { duration?: number; from?: number } = {}): TransitionConfig {
  const d = reducedMotion() ? dur.fast : params.duration ?? dur.std;
  const from = params.from ?? 0.94;
  return {
    duration: d,
    easing: ease.outExpo,
    css: (t) => {
      const s = from + (1 - from) * t;
      return `transform: scale(${s}); opacity: ${t};`;
    }
  };
}

/* ---------- Subtle bounce on tap ---------- */
export function press(node: HTMLElement, _: unknown): TransitionConfig {
  return {
    duration: 180,
    easing: ease.spring,
    css: (t) => `transform: scale(${0.97 + t * 0.03});`
  };
}

/* ---------- Stagger fade-in for list items ---------- */
export function fadeUp(node: HTMLElement, params: { delay?: number; y?: number } = {}): TransitionConfig {
  const d = reducedMotion() ? dur.fast : 320;
  const y = params.y ?? 8;
  return {
    duration: d,
    delay: params.delay ?? 0,
    easing: ease.outExpo,
    css: (t) => `transform: translateY(${(1 - t) * y}px); opacity: ${t};`
  };
}

/* ---------- Haptic (no-op on desktop) ---------- */
export function haptic(ms = 8) {
  if (typeof window === 'undefined') return;
  if (reducedMotion()) return;
  const v = (window.navigator as unknown as { vibrate?: (n: number) => boolean }).vibrate;
  if (typeof v === 'function') v(ms);
}
