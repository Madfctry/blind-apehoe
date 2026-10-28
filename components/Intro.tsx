'use client';

import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { config } from '@/lib/config';
import { KEYS, prefersReducedMotion, storage, store, toast } from '@/lib/store';
import { Blocks } from './Blocks';
import { PixelText } from './PixelText';

export const INTRO_DONE = 'bah:intro-done';
export const INTRO_REPLAY = 'bah:intro-replay';

const { boot, welcome } = config.copy;
const WELCOME_AT = 600; // ms after power-on: the card comes up as the shutters part
const EXIT_AT = 3500; // the tube holds the name, then hands over
const COLLAPSE = 320;

/** Dotted leaders between a console label and its value, at a fixed column. */
function BootLine({ label, value, delay }: { label: string; value: string; delay: number }) {
  const dots = '·'.repeat(Math.max(3, 16 - label.length));
  return (
    <span className="boot-line" style={{ animationDelay: `${delay}ms` } as CSSProperties}>
      <Blocks text={label} label={label.replace(/█+/g, 'redacted')} /> {dots}{' '}
      <span className="phos">
        <Blocks text={value} label={value.replace(/█+/g, 'redacted')} />
      </span>
    </span>
  );
}

/**
 * The power-on. Rendered on the server but hidden; an inline <head> script
 * flips html[data-intro="play"] before first paint for first-time visitors,
 * so there is no flash of the page and no layout shift.
 */
export function Intro() {
  const root = useRef<HTMLDivElement>(null);
  const crt = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(true);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    clear();
    storage.set(KEYS.intro, '1');
    document.documentElement.removeAttribute('data-intro');
    store.set({ introPlaying: false });
    // The tube switches modes: displacement, a dropout, then lock.
    const main = document.getElementById('main');
    if (main && !prefersReducedMotion()) {
      main.classList.remove('gsnap');
      void main.offsetWidth;
      main.classList.add('gsnap');
      setTimeout(() => main.classList.remove('gsnap'), 500);
    }
    window.dispatchEvent(new Event(INTRO_DONE));
  }, []);

  /** Put the picture away: the card collapses to a line, the line to a dot. */
  const collapse = useCallback(() => {
    const c = card.current;
    if (finished.current || !c) return;
    clear();
    c.animate(
      [
        { transform: 'scaleY(1)', filter: 'brightness(1)', opacity: 1 },
        { transform: 'scaleY(0.014)', filter: 'brightness(3)', opacity: 1, offset: 0.52 },
        { transform: 'scaleY(0.009) scaleX(0.86)', filter: 'brightness(3)', opacity: 1, offset: 0.76 },
        { transform: 'scaleY(0.007) scaleX(0)', opacity: 0 },
      ],
      { duration: COLLAPSE, easing: 'cubic-bezier(.55,0,.75,.15)', fill: 'forwards' },
    );
    timers.current.push(setTimeout(finish, COLLAPSE));
  }, [finish]);

  const play = useCallback(() => {
    const r = root.current;
    const tube = crt.current;
    const c = card.current;
    if (!r || !tube || !c) return;
    clear();
    finished.current = false;
    store.set({ introPlaying: true });
    document.documentElement.setAttribute('data-intro', 'play');
    c.getAnimations().forEach((a) => a.cancel());
    tube.classList.remove('go');
    c.classList.remove('go');
    void tube.offsetWidth;
    tube.classList.add('go');
    timers.current.push(setTimeout(() => c.classList.add('go'), WELCOME_AT));
    timers.current.push(setTimeout(collapse, EXIT_AT));
  }, [collapse]);

  // First visit
  useEffect(() => {
    if (document.documentElement.getAttribute('data-intro') === 'play') play();
    return clear;
  }, [play]);

  // Replay from the footer / start menu
  useEffect(() => {
    const onReplay = () => {
      if (prefersReducedMotion() || !config.features.intro) {
        toast('motion reduced. intro withheld.');
        return;
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.dispatchEvent(new Event('bah:scroll-top'));
      play();
    };
    window.addEventListener(INTRO_REPLAY, onReplay);
    return () => window.removeEventListener(INTRO_REPLAY, onReplay);
  }, [play]);

  // Any key skips.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished.current || e.repeat) return;
      if (e.key === 'Tab' || e.key === 'Shift') return;
      collapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapse]);

  return (
    <div ref={root} className="intro fixed inset-0 z-[90] bg-void" aria-label="Intro sequence" role="dialog" aria-modal="true">
      {/* the welcome card the tube comes up on */}
      <div ref={card} className="wl absolute inset-0 bg-void">
        <div className="label absolute left-[5.5%] top-[6%] text-[clamp(14px,1.3vw,18px)] normal-case tracking-[0.04em]" aria-live="polite">
          {boot.map(([l, v], i) => (
            <BootLine key={l} label={l} value={v} delay={300 + i * 250} />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="wl-to label phos tracking-[0.48em]">{welcome.to}</p>
          <div className="wl-name flick">
            <PixelText text="BLIND APE HOE" className="text-[clamp(28px,7.4vw,104px)]" />
          </div>
          <p className="wl-sub label tracking-[0.3em]">{welcome.sub}</p>
        </div>
        <p className="wl-hint label absolute bottom-[6%] left-1/2 -translate-x-1/2 tracking-[0.28em]">{welcome.hint}</p>
        <div className="wl-wash pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="fx-raster !absolute" aria-hidden="true" />
      </div>

      {/* the tube warming up */}
      <div ref={crt} className="crt pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="crt-shutter crt-top" />
        <div className="crt-shutter crt-bot" />
        <div className="crt-bloom" />
        <div className="crt-beam" />
        <div className="crt-roll" />
        <div className="crt-lines" />
        <div className="crt-flash" />
      </div>

      <button
        type="button"
        onClick={collapse}
        className="label absolute right-[var(--gutter)] top-5 z-10 flex min-h-[44px] items-center gap-2 border border-paper bg-void px-4 hover:bg-paper hover:text-void"
      >
        SKIP INTRO <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}
