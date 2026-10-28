'use client';

import { useEffect, useRef } from 'react';
import { glyph } from '@/lib/pixelfont';
import { prefersReducedMotion } from '@/lib/store';
import { whenIdle } from '@/lib/motion';

const CHARS = ['0', '1', '0', '1', '█', '$', '/', ':', '·', '?'];
const CELL = 8; // canvas px per glyph column (5 px glyph + gap), rendered at low res and scaled up crisp

/**
 * 1-bit digital rain. Bits fall in columns, white on black, drawn from the
 * same 5×7 glyphs as the titles. Low-res canvas, pixelated upscale, paused
 * off-screen; a single still frame under reduced motion.
 */
export function Rain({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const reduce = prefersReducedMotion();
    ctx.imageSmoothingEnabled = false;
    const SCALE = window.innerWidth < 768 ? 2 : 3; // css px per canvas px
    let cols = 0;
    let rows = 0;
    let drops: { y: number; speed: number; len: number; chars: string[] }[] = [];
    let raf = 0;
    let visible = true;
    let last = 0;

    const resize = () => {
      const r = c.getBoundingClientRect();
      c.width = Math.max(1, Math.floor(r.width / SCALE));
      c.height = Math.max(1, Math.floor(r.height / SCALE));
      cols = Math.ceil(c.width / CELL);
      rows = Math.ceil(c.height / 9);
      drops = Array.from({ length: cols }, () => ({
        y: Math.random() * rows * 2 - rows,
        speed: 0.12 + Math.random() * 0.3,
        len: 6 + Math.floor(Math.random() * 18),
        chars: Array.from({ length: 40 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      }));
    };

    // Each glyph is rasterised once into a 5×7 sprite; a frame is just drawImage calls.
    const sprites = new Map<string, HTMLCanvasElement>();
    for (const ch of CHARS) {
      const g = glyph(ch);
      if (!g || sprites.has(ch)) continue;
      const sc = document.createElement('canvas');
      sc.width = 5;
      sc.height = 7;
      const sx = sc.getContext('2d')!;
      sx.fillStyle = '#fff';
      for (let r = 0; r < 7; r++) for (let k = 0; k < 5; k++) if (g[r][k] === '1') sx.fillRect(k, r, 1, 1);
      sprites.set(ch, sc);
    }
    const drawGlyph = (ch: string, x: number, y: number) => {
      const sp = sprites.get(ch);
      if (sp) ctx.drawImage(sp, x, y);
    };

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible || t - last < 50) return; // ~20fps is plenty for rain
      last = t;
      draw();
    };

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (let i = 0; i < cols; i++) {
        const d = drops[i];
        if (!reduce) d.y += d.speed;
        if (d.y - d.len > rows) {
          d.y = -Math.random() * 20;
          d.speed = 0.12 + Math.random() * 0.3;
        }
        const head = Math.floor(d.y);
        for (let j = 0; j < d.len; j++) {
          const row = head - j;
          if (row < 0 || row > rows) continue;
          ctx.globalAlpha = j === 0 ? 1 : Math.max(0, 0.55 * (1 - j / d.len));
          if (Math.random() < 0.02) d.chars[(row + 40) % 40] = CHARS[Math.floor(Math.random() * CHARS.length)];
          drawGlyph(d.chars[(row + 40) % 40], i * CELL + 1, row * 9);
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw();
    });
    ro.observe(c);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(c);
    const onVis = () => (visible = !document.hidden);
    document.addEventListener('visibilitychange', onVis);
    // Decoration: it waits until the page is idle before it starts falling.
    const cancelIdle = whenIdle(() => {
      if (reduce) draw();
      else raf = requestAnimationFrame(frame);
    }, 2500);
    return () => {
      cancelIdle();
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={`pointer-events-none [image-rendering:pixelated] ${className}`} />;
}
