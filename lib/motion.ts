'use client';

/**
 * GSAP + ScrollTrigger, loaded after the page is idle so they never sit on the
 * critical path. Every scroll-linked effect is decoration; the page is complete
 * without them.
 */
import type { gsap as GSAP } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';

export type Motion = { gsap: typeof GSAP; ScrollTrigger: typeof ST };

let pending: Promise<Motion> | null = null;

export function loadMotion(): Promise<Motion> {
  if (!pending) {
    pending = Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
      g.gsap.registerPlugin(s.ScrollTrigger);
      return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
    });
  }
  return pending;
}

/** Run fn once the main thread is quiet. Returns a cancel fn. */
export function whenIdle(fn: () => void, timeout = 1800): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(fn, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(fn, 300);
  return () => window.clearTimeout(id);
}
