'use client';

import { useEffect, useRef } from 'react';
import { isFinePointer } from '@/lib/store';

const INTERACTIVE = 'a,button,input,textarea,select,label,summary,[role="button"],[data-cursor="bar"],.rd-w[data-r]';

/** 8px paper square. Over anything interactive it becomes the redaction bar itself. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFinePointer()) return;
    const el = ref.current;
    const shape = inner.current;
    if (!el || !shape) return;
    const root = document.documentElement;
    root.classList.add('has-cursor');

    let x = -100;
    let y = -100;
    let bar = false;
    let down = false;
    let visible = false;
    let raf = 0;

    const render = () => {
      raf = 0;
      const sx = bar ? 1 : 8 / 48;
      const sy = (bar ? 1 : 8 / 10) * (down ? 0.6 : 1);
      el.style.transform = `translate3d(${x - 24}px, ${y - 5}px, 0)`;
      shape.style.transform = `scale(${sx}, ${sy})`;
      el.style.opacity = visible ? '1' : '0';
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      x = e.clientX;
      y = e.clientY;
      const t = e.target as Element | null;
      visible = !t?.closest?.('[data-cursor="native"]');
      bar = !!t?.closest?.(INTERACTIVE) && !t?.closest?.('[data-cursor="dot"]');
      queue();
    };
    const leave = () => {
      visible = false;
      queue();
    };
    const pd = () => {
      down = true;
      queue();
    };
    const pu = () => {
      down = false;
      queue();
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', pd, { passive: true });
    window.addEventListener('pointerup', pu, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      root.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', pd);
      window.removeEventListener('pointerup', pu);
      document.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden h-[10px] w-[48px] opacity-0 mix-blend-difference transition-opacity duration-200 [@media(hover:hover)_and_(pointer:fine)]:block"
      style={{ transform: 'translate3d(-100px,-100px,0)' }}
    >
      <div
        ref={inner}
        className="h-full w-full bg-[#fff]"
        style={{ transform: 'scale(0.1667, 0.8)', transition: 'transform 200ms cubic-bezier(0.22,1,0.36,1)' }}
      />
    </div>
  );
}
