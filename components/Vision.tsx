'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { isFinePointer, prefersReducedMotion, useUI } from '@/lib/store';

/**
 * "Going blind". A fixed veil with a hole where the cursor is looking.
 * The hole lags behind the pointer (lerp) and narrows as you scroll deeper.
 * Desktop only. Mood, never an obstacle: the edge still shows ~35% of the page.
 */
export function Vision() {
  const ref = useRef<HTMLDivElement>(null);
  const [capable, setCapable] = useState(false);
  const sight = useUI((s) => s.sight);
  const inverted = useUI((s) => s.inverted);
  const intro = useUI((s) => s.introPlaying);
  const active = capable && sight && !inverted && !intro;

  useEffect(() => {
    if (!config.features.vision) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCapable(isFinePointer() && !prefersReducedMotion());
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const { from, to, edgeVisibility, lerp } = config.vision;
    const veil = 1 - edgeVisibility;

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight * 0.45;
    let x = tx;
    let y = ty;
    let r = from;
    let last = '';
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX;
      ty = e.clientY;
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      x += (tx - x) * lerp;
      y += (ty - y) * lerp;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      const target = from + (to - from) * p;
      r += (target - r) * 0.08;
      const key = `${x.toFixed(1)}|${y.toFixed(1)}|${r.toFixed(1)}`;
      if (key === last) return;
      last = key;
      const a = (k: number) => `rgb(0 0 0 / ${(veil * k).toFixed(3)})`;
      el.style.background = `radial-gradient(circle at ${x}px ${y}px, transparent 0px, transparent ${r * 0.55}px, ${a(0.18)} ${r * 0.75}px, ${a(0.55)} ${r * 1.0}px, ${a(0.85)} ${r * 1.3}px, ${a(1)} ${r * 1.7}px)`;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
    };
  }, [active]);

  if (!capable) return null;
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 transition-opacity duration-700 ease-expo"
      style={{ opacity: active ? 1 : 0 }}
    />
  );
}
