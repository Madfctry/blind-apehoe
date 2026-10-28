'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';
import { config } from '@/lib/config';
import { isFinePointer, prefersReducedMotion, store, toast, useUI } from '@/lib/store';
import { startDrone } from '@/lib/sound';
import { loadMotion, whenIdle } from '@/lib/motion';

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

/** Smooth scroll (desktop only) wired into GSAP's ticker + ScrollTrigger. */
function useSmoothScroll() {
  const intro = useUI((s) => s.introPlaying);

  useEffect(() => {
    if (!config.features.lenis || !isFinePointer() || prefersReducedMotion()) return;
    let dead = false;
    let cleanup = () => {};
    const cancel = whenIdle(async () => {
      const [{ gsap, ScrollTrigger }, { default: LenisCtor }] = await Promise.all([loadMotion(), import('lenis')]);
      if (dead) return;
      const l = new LenisCtor({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: { offset: -32 } });
      lenis = l;
      if (store.get().introPlaying) l.stop();
      l.on('scroll', ScrollTrigger.update);
      const raf = (time: number) => l.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      const top = () => l.scrollTo(0, { immediate: true, force: true });
      window.addEventListener('bah:scroll-top', top);
      cleanup = () => {
        gsap.ticker.remove(raf);
        window.removeEventListener('bah:scroll-top', top);
        l.destroy();
        lenis = null;
      };
    });
    return () => {
      dead = true;
      cancel();
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (intro) lenis?.stop();
    else lenis?.start();
  }, [intro]);
}

/** [data-reveal] → fades up once, the first time it enters the viewport. */
function useReveals() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (prefersReducedMotion()) {
      els.forEach((e) => e.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/** Easter egg #1 — type "blind", "███" or the Konami code. */
function useEasterEggs() {
  useEffect(() => {
    if (!config.features.easterEggs) return;
    const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    let buf = '';
    let keys: string[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    const swap = (on: boolean) => {
      const html = document.documentElement;
      html.classList.add('inverting');
      html.classList.toggle('inverted', on);
      store.set({ inverted: on });
      setTimeout(() => html.classList.remove('inverting'), 650);
    };
    const invert = () => {
      if (store.get().inverted) return;
      swap(true);
      toast(config.copy.eggs.invert, 3200);
      clearTimeout(timer);
      timer = setTimeout(() => swap(false), 10_000);
    };

    const onKey = (e: KeyboardEvent) => {
      if (store.get().introPlaying) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      keys = [...keys, k].slice(-KONAMI.length);
      if (keys.join() === KONAMI.join()) {
        keys = [];
        invert();
      }
      if (e.key.length === 1) {
        buf = (buf + k).slice(-8);
        if (buf.endsWith('blind') || buf.endsWith('███')) {
          buf = '';
          invert();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('bah:invert', invert);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('bah:invert', invert);
      clearTimeout(timer);
    };
  }, []);
}

/** Easter egg #3. */
function useConsoleMessage() {
  useEffect(() => {
    const w = window as unknown as { __bah?: boolean };
    if (w.__bah) return;
    w.__bah = true;
    // eslint-disable-next-line no-console
    console.log(
      '%c ███ %c\n\nyou opened the inspector.\nthe ape is not impressed.\n\n$███',
      'background:#fff;color:#fff;font:700 20px monospace;padding:4px 0',
      'color:#fff;font:12px/1.6 monospace',
    );
  }, []);
}

/** Every few seconds one visible pixel heading tears and re-locks. */
function useGlitches() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let t: ReturnType<typeof setTimeout>;
    const visible = new Set<Element>();
    const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))));
    document.querySelectorAll('.glitchable').forEach((el) => io.observe(el));
    const fire = () => {
      const list = [...visible];
      if (list.length && !document.hidden) {
        const el = list[Math.floor(Math.random() * list.length)];
        el.classList.add('glitching');
        setTimeout(() => el.classList.remove('glitching'), 440);
      }
      t = setTimeout(fire, 2600 + Math.random() * 3800);
    };
    t = setTimeout(fire, 2400);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, []);
}

/** Site ambience: a near-subliminal drone while SOUND is on. */
function useAmbience() {
  const sound = useUI((s) => s.sound);
  useEffect(() => {
    if (!sound) return;
    return startDrone(0.022, 48);
  }, [sound]);
}

export function Effects() {
  useSmoothScroll();
  useReveals();
  useEasterEggs();
  useConsoleMessage();
  useAmbience();
  useGlitches();
  return null;
}

export function Toast() {
  const t = useUI((s) => s.toast);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--tb)+16px)] z-[80] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {t && (
        <p key={t.id} className="win label max-w-full" style={{ animation: 'toast-in 380ms cubic-bezier(.16,1,.3,1)' }}>
          <span className="block px-4 py-2.5 phos">{t.text}</span>
        </p>
      )}
    </div>
  );
}

/** The glass: raster over everything (text included), vignette, grain. */
export function Atmosphere() {
  return (
    <div aria-hidden="true">
      <div className="fx-vignette" />
      <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden">
        <div className="fx-grain" />
      </div>
      <div className="fx-raster" />
    </div>
  );
}
