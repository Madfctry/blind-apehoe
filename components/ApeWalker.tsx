'use client';

import { useEffect, useRef } from 'react';
import { FRAMES, SPRITE_H, SPRITE_W, apeFrame, tipContact } from '@/lib/apeSprite';
import { prefersReducedMotion } from '@/lib/store';

const STRIDE_MS = 1000; // one full walk cycle
const SPRITE_STEP = 6; // sprite px travelled per stride (matches the cane drag-back)

/**
 * The Blind Ape walking along the bottom of the page with its white cane.
 * Pre-rendered 1-bit frames, drawn nearest-neighbour onto a canvas. Each time
 * the cane plants, a small sonar ring taps out. Paused off-screen; standing
 * still under reduced motion.
 */
export function ApeWalker() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    // Pre-render the frames once (white pixels, dither on the checkerboard).
    const sprites = Array.from({ length: FRAMES }, (_, f) => {
      const g = apeFrame(f);
      const c = document.createElement('canvas');
      c.width = SPRITE_W;
      c.height = SPRITE_H;
      const x = c.getContext('2d')!;
      x.fillStyle = '#fff';
      for (let y = 0; y < SPRITE_H; y++)
        for (let k = 0; k < SPRITE_W; k++) {
          const v = g[y * SPRITE_W + k];
          if (v === 1 || (v === 2 && (k + y) % 2 === 0)) x.fillRect(k, y, 1, 1);
        }
      return c;
    });

    const reduce = prefersReducedMotion();
    let scale = 3;
    let width = 0;
    let raf = 0;
    let visible = false;
    const start = performance.now();
    let lastFrame = -1;
    const taps: { x: number; born: number }[] = [];

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      scale = r.width < 640 ? 2 : 3;
      width = Math.ceil(r.width / scale);
      canvas.width = width;
      canvas.height = SPRITE_H + 2;
      draw(performance.now());
    };

    const draw = (now: number) => {
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const elapsed = reduce ? 0 : now - start;
      const strides = elapsed / STRIDE_MS;
      const f = reduce ? 1 : Math.floor((strides % 1) * FRAMES);
      // Position advances a whole sprite pixel at a time, in step with the frames.
      const span = width + SPRITE_W * 2;
      const travelled = Math.floor(strides * SPRITE_STEP + (reduce ? width / 2 : 0));
      const x = (travelled % span) - SPRITE_W;

      // a tap ring each time the cane plants
      if (!reduce && f !== lastFrame && f === 0) {
        const tip = tipContact(0);
        if (tip !== null) taps.push({ x: x + tip, born: now });
      }
      lastFrame = f;
      ctx.fillStyle = '#fff';
      for (let i = taps.length - 1; i >= 0; i--) {
        const age = (now - taps[i].born) / 600;
        if (age > 1) {
          taps.splice(i, 1);
          continue;
        }
        const r = 1 + Math.floor(age * 6);
        // a dithered half-ring hugging the ground
        for (let a = 0; a <= Math.PI; a += 0.35 / r) {
          const px = Math.round(taps[i].x + Math.cos(a) * r);
          const py = Math.round(SPRITE_H - 1 - Math.sin(a) * r * 0.6);
          if ((px + py) % 2 === 0) ctx.fillRect(px, py, 1, 1);
        }
      }
      ctx.drawImage(sprites[f], x, 1);
    };

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || document.hidden) return;
      draw(now);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(canvas);
    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div className="ape-walker relative h-[90px] w-full sm:h-[134px]" aria-hidden="true">
      <canvas
        ref={ref}
        className="ape-canvas absolute inset-x-0 bottom-[3px] h-[88px] w-full [image-rendering:pixelated] sm:h-[132px]"
      />
      <span className="rule-t absolute inset-x-0 bottom-0 h-px" />
    </div>
  );
}
