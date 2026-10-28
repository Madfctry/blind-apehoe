'use client';

import { useSyncExternalStore } from 'react';

/**
 * Tiny global store (no dependency). Holds the few bits of UI state that
 * several distant components need to agree on.
 */
export type UIState = {
  sight: boolean; // "going blind" vision overlay
  sound: boolean; // global audio toggle (muted by default)
  inverted: boolean; // easter egg: white mode
  introPlaying: boolean;
  toast: { id: number; text: string } | null;
};

let state: UIState = {
  sight: true,
  sound: false,
  inverted: false,
  introPlaying: false,
  toast: null,
};

const listeners = new Set<() => void>();

export const store = {
  get: () => state,
  set(patch: Partial<UIState>) {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const serverState = state;

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(serverState),
  );
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, ms = 2600) {
  store.set({ toast: { id: Date.now(), text } });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => store.set({ toast: null }), ms);
}

/** Safe localStorage (private windows, blocked storage, previews). */
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* unseen. unsaved. fine. */
    }
  },
};

export { KEYS } from './keys';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isFinePointer = () =>
  typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
