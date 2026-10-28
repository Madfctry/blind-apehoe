'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import { config, shareToX } from '@/lib/config';
import { uiTick } from '@/lib/sound';
import { Window } from '../Window';
import { Blocks } from '../Blocks';
import { Section } from '../ui';

const { redactor } = config.copy;
const OUT = 1080;
const MAX_SRC = 2048;
const MAX_ZOOM = 6;

type Bar = { cx: number; cy: number; w: number; h: number; rot: number };
type View = { s: number; x: number; y: number };
type Mode = 'none' | 'pan' | 'move' | 'rotate' | 'resize' | 'resize-w' | 'resize-h' | 'pinch';

const DEFAULT_BAR: Bar = { cx: 540, cy: 420, w: 640, h: 130, rot: 0 };
const PAPER = '#FFFFFF';

function toCanvas(img: CanvasImageSource & { width: number; height: number }) {
  const k = Math.min(1, MAX_SRC / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

function monochrome(src: HTMLCanvasElement) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Rec. 709 luma, slight contrast push for a stark print feel.
    let v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    v = (v - 128) * 1.12 + 124;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

let grainTile: HTMLCanvasElement | null = null;
function getGrain() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

function drawStamp(ctx: CanvasRenderingContext2D, fontFamily: string) {
  const size = 34;
  ctx.save();
  ctx.font = `500 ${size}px ${fontFamily}`;
  const dollar = ctx.measureText('$').width;
  const cw = size * 0.6;
  const pad = 14;
  const w = pad * 2 + dollar + 3 * cw + 2 * 3;
  const h = size + pad * 1.2;
  const x = OUT - 36 - w;
  const y = OUT - 36 - h;
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  ctx.fillStyle = PAPER;
  ctx.textBaseline = 'middle';
  ctx.fillText('$', x + pad, y + h / 2 + 1);
  let bx = x + pad + dollar + 2;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(bx, y + h / 2 - size * 0.36, cw - 3, size * 0.74);
    bx += cw + 3;
  }
  ctx.restore();
}

export function Redactor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const src = useRef<{ orig: HTMLCanvasElement; mono: HTMLCanvasElement | null } | null>(null);
  const view = useRef<View>({ s: 1, x: 0, y: 0 });
  const bar = useRef<Bar>({ ...DEFAULT_BAR });
  const opts = useRef({ stamp: true, grain: false, mono: true });
  const raf = useRef(0);
  const monoFont = useRef('monospace');

  const [hasImage, setHasImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toggles, setToggles] = useState(opts.current);
  const [ui, setUi] = useState({ zoom: 1, w: DEFAULT_BAR.w, h: DEFAULT_BAR.h, rot: 0 });
  const [done, setDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const minScale = () => {
    const o = src.current!.orig;
    return Math.max(OUT / o.width, OUT / o.height);
  };

  const clampView = useCallback(() => {
    if (!src.current) return;
    const o = src.current.orig;
    const v = view.current;
    const sMin = minScale();
    v.s = Math.min(sMin * MAX_ZOOM, Math.max(sMin, v.s));
    v.x = Math.min(0, Math.max(OUT - o.width * v.s, v.x));
    v.y = Math.min(0, Math.max(OUT - o.height * v.s, v.y));
  }, []);

  const syncUi = useCallback(() => {
    if (!src.current) return;
    const b = bar.current;
    setUi({ zoom: view.current.s / minScale(), w: Math.round(b.w), h: Math.round(b.h), rot: Math.round((b.rot * 180) / Math.PI) });
  }, []);

  /** Draw the composition. `handles` adds the editing chrome (never exported). */
  const compose = useCallback((ctx: CanvasRenderingContext2D, k: number, handles: number | false) => {
    const s = src.current;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, OUT, OUT);
    if (!s) return;
    const o = opts.current;
    if (o.mono && !s.mono) s.mono = monochrome(s.orig);
    const img = o.mono && s.mono ? s.mono : s.orig;
    const v = view.current;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, v.x, v.y, s.orig.width * v.s, s.orig.height * v.s);

    if (o.grain) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.32;
      const p = ctx.createPattern(getGrain(), 'repeat');
      if (p) {
        ctx.fillStyle = p;
        ctx.fillRect(0, 0, OUT, OUT);
      }
      ctx.restore();
    }

    const b = bar.current;
    ctx.save();
    ctx.translate(b.cx, b.cy);
    ctx.rotate(b.rot);
    ctx.fillStyle = '#000';
    ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.restore();

    if (o.stamp) drawStamp(ctx, monoFont.current);

    if (handles) {
      const u = handles; // 1080-units per CSS px
      ctx.save();
      ctx.translate(b.cx, b.cy);
      ctx.rotate(b.rot);
      ctx.strokeStyle = PAPER;
      ctx.lineWidth = 1 * u;
      ctx.setLineDash([4 * u, 4 * u]);
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.setLineDash([]);
      const top = -b.h / 2;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(0, top - 28 * u);
      ctx.stroke();
      const hs = 9 * u;
      const pts: [number, number][] = [
        [-b.w / 2, -b.h / 2],
        [b.w / 2, -b.h / 2],
        [-b.w / 2, b.h / 2],
        [b.w / 2, b.h / 2],
        [-b.w / 2, 0],
        [b.w / 2, 0],
        [0, b.h / 2],
      ];
      ctx.fillStyle = PAPER;
      ctx.strokeStyle = '#000';
      for (const [px, py] of pts) {
        ctx.fillRect(px - hs / 2, py - hs / 2, hs, hs);
        ctx.strokeRect(px - hs / 2, py - hs / 2, hs, hs);
      }
      // rotation handle: a ring
      ctx.beginPath();
      ctx.arc(0, top - 28 * u, 6 * u, 0, Math.PI * 2);
      ctx.fillStyle = '#000';
      ctx.fill();
      ctx.lineWidth = 1.5 * u;
      ctx.strokeStyle = PAPER;
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  const render = useCallback(() => {
    raf.current = 0;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const css = c.getBoundingClientRect().width || 1;
    compose(ctx, c.width / OUT, OUT / css);
  }, [compose]);

  const invalidate = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(render);
  }, [render]);

  // Resolve the mono webfont family for the stamp.
  useEffect(() => {
    const f = getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim();
    if (f) monoFont.current = f;
  }, []);

  // Size the preview canvas to its box × DPR.
  useEffect(() => {
    const c = canvasRef.current;
    const wrap = wrapRef.current;
    if (!c || !wrap) return;
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      const px = Math.min(OUT, Math.round(w * Math.min(2, window.devicePixelRatio || 1)));
      if (c.width !== px) {
        c.width = c.height = px;
      }
      invalidate();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [invalidate, hasImage]);

  const loadImage = useCallback(
    async (url: string) => {
      setLoading(true);
      setError('');
      setDone(false);
      try {
        const img = new Image();
        img.decoding = 'async';
        img.src = url;
        await img.decode();
        const orig = toCanvas(img);
        src.current = { orig, mono: null };
        const sMin = Math.max(OUT / orig.width, OUT / orig.height);
        view.current = { s: sMin, x: (OUT - orig.width * sMin) / 2, y: (OUT - orig.height * sMin) / 2 };
        bar.current = { ...DEFAULT_BAR };
        setHasImage(true);
        syncUi();
        invalidate();
        uiTick();
      } catch {
        setError('that file refused to be seen. try a jpg or png.');
      } finally {
        setLoading(false);
        URL.revokeObjectURL(url);
      }
    },
    [invalidate, syncUi],
  );

  const onFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError('images only. the ape cannot read.');
      return;
    }
    void loadImage(URL.createObjectURL(f));
  };

  const reset = () => {
    src.current = null;
    bar.current = { ...DEFAULT_BAR };
    opts.current = { stamp: true, grain: false, mono: true };
    setToggles(opts.current);
    setHasImage(false);
    setDone(false);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ───────── Pointer interaction ─────────
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{ mode: Mode; lx: number; ly: number; pinchD: number; pinchM: { x: number; y: number } }>({
    mode: 'none',
    lx: 0,
    ly: 0,
    pinchD: 0,
    pinchM: { x: 0, y: 0 },
  });
  const [cursorMode, setCursorMode] = useState<Mode>('none');

  const toUnits = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const k = OUT / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k, u: k };
  };

  const hitTest = (p: { x: number; y: number; u: number }): Mode => {
    const b = bar.current;
    const dx = p.x - b.cx;
    const dy = p.y - b.cy;
    const c = Math.cos(-b.rot);
    const s = Math.sin(-b.rot);
    const lx = dx * c - dy * s;
    const ly = dx * s + dy * c;
    const r = 16 * p.u;
    const near = (x: number, y: number) => Math.hypot(lx - x, ly - y) < r;
    if (near(0, -b.h / 2 - 28 * p.u)) return 'rotate';
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) if (near((sx * b.w) / 2, (sy * b.h) / 2)) return 'resize';
    if (near(-b.w / 2, 0) || near(b.w / 2, 0)) return 'resize-w';
    if (near(0, b.h / 2)) return 'resize-h';
    if (Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2) return 'move';
    return 'pan';
  };

  const zoomAt = (factor: number, cx: number, cy: number) => {
    const v = view.current;
    const sMin = minScale();
    const next = Math.min(sMin * MAX_ZOOM, Math.max(sMin, v.s * factor));
    const f = next / v.s;
    v.x = cx - (cx - v.x) * f;
    v.y = cy - (cy - v.y) * f;
    v.s = next;
    clampView();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!src.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toUnits(e);
    const d = drag.current;
    if (pointers.current.size === 2 && d.mode !== 'move' && d.mode !== 'rotate' && !d.mode.startsWith('resize')) {
      const [a, b] = [...pointers.current.values()];
      d.mode = 'pinch';
      d.pinchD = Math.hypot(a.x - b.x, a.y - b.y);
      d.pinchM = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      return;
    }
    d.mode = hitTest(p);
    d.lx = p.x;
    d.ly = p.y;
    setCursorMode(d.mode);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!src.current) return;
    const d = drag.current;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const p = toUnits(e);
    if (d.mode === 'none') {
      const m = hitTest(p);
      if (m !== cursorMode) setCursorMode(m);
      return;
    }
    const b = bar.current;
    const v = view.current;
    if (d.mode === 'pinch' && pointers.current.size >= 2) {
      const [a, c] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - c.x, a.y - c.y);
      const mid = { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 };
      const r = canvasRef.current!.getBoundingClientRect();
      const k = OUT / r.width;
      v.x += (mid.x - d.pinchM.x) * k;
      v.y += (mid.y - d.pinchM.y) * k;
      zoomAt(dist / (d.pinchD || dist), (mid.x - r.left) * k, (mid.y - r.top) * k);
      d.pinchD = dist;
      d.pinchM = mid;
      invalidate();
      return;
    }
    const dx = p.x - d.lx;
    const dy = p.y - d.ly;
    d.lx = p.x;
    d.ly = p.y;
    const c = Math.cos(-b.rot);
    const s = Math.sin(-b.rot);
    const lx = (p.x - b.cx) * c - (p.y - b.cy) * s;
    const ly = (p.x - b.cx) * s + (p.y - b.cy) * c;
    switch (d.mode) {
      case 'move':
        b.cx = Math.min(OUT, Math.max(0, b.cx + dx));
        b.cy = Math.min(OUT, Math.max(0, b.cy + dy));
        break;
      case 'pan':
        v.x += dx;
        v.y += dy;
        clampView();
        break;
      case 'resize':
        b.w = Math.min(OUT * 1.4, Math.max(40, Math.abs(lx) * 2));
        b.h = Math.min(OUT, Math.max(12, Math.abs(ly) * 2));
        break;
      case 'resize-w':
        b.w = Math.min(OUT * 1.4, Math.max(40, Math.abs(lx) * 2));
        break;
      case 'resize-h':
        b.h = Math.min(OUT, Math.max(12, Math.abs(ly) * 2));
        break;
      case 'rotate': {
        let a = Math.atan2(p.y - b.cy, p.x - b.cx) + Math.PI / 2;
        if (a > Math.PI) a -= Math.PI * 2;
        const step = e.shiftKey ? 15 : 0;
        const deg = (a * 180) / Math.PI;
        if (step) a = ((Math.round(deg / step) * step) * Math.PI) / 180;
        else if (Math.abs(deg) < 2.5) a = 0; // magnetic level
        b.rot = a;
        break;
      }
    }
    invalidate();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      drag.current.mode = 'none';
      syncUi();
    } else if (drag.current.mode === 'pinch') {
      const [rest] = [...pointers.current.values()];
      const p = toUnits({ clientX: rest.x, clientY: rest.y });
      drag.current = { ...drag.current, mode: 'pan', lx: p.x, ly: p.y };
    }
  };

  // Wheel zoom (non-passive so the page doesn't scroll under the editor).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !hasImage) return;
    const onWheel = (e: WheelEvent) => {
      if (!src.current) return;
      e.preventDefault();
      const p = toUnits(e);
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
      invalidate();
      syncUi();
    };
    c.addEventListener('wheel', onWheel, { passive: false });
    return () => c.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasImage, invalidate, syncUi]);

  // Keyboard: arrows move the bar, +/- zoom, [ ] rotate.
  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (!src.current) return;
    const b = bar.current;
    const step = e.shiftKey ? 20 : 4;
    let handled = true;
    switch (e.key) {
      case 'ArrowLeft':
        b.cx -= step;
        break;
      case 'ArrowRight':
        b.cx += step;
        break;
      case 'ArrowUp':
        b.cy -= step;
        break;
      case 'ArrowDown':
        b.cy += step;
        break;
      case '[':
        b.rot -= ((e.shiftKey ? 15 : 1) * Math.PI) / 180;
        break;
      case ']':
        b.rot += ((e.shiftKey ? 15 : 1) * Math.PI) / 180;
        break;
      case '+':
      case '=':
        zoomAt(1.1, OUT / 2, OUT / 2);
        break;
      case '-':
        zoomAt(1 / 1.1, OUT / 2, OUT / 2);
        break;
      default:
        handled = false;
    }
    if (handled) {
      e.preventDefault();
      invalidate();
      syncUi();
    }
  };

  const setToggle = (k: keyof typeof opts.current) => (e: ChangeEvent<HTMLInputElement>) => {
    opts.current = { ...opts.current, [k]: e.target.checked };
    setToggles(opts.current);
    invalidate();
    uiTick();
  };

  const setSlider = (k: 'zoom' | 'w' | 'h' | 'rot') => (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const b = bar.current;
    if (k === 'zoom') {
      const target = val * minScale();
      zoomAt(target / view.current.s, OUT / 2, OUT / 2);
    } else if (k === 'w') b.w = val;
    else if (k === 'h') b.h = val;
    else b.rot = (val * Math.PI) / 180;
    setUi((u) => ({ ...u, [k]: val }));
    invalidate();
  };

  const download = async () => {
    if (!src.current) return;
    const c = document.createElement('canvas');
    c.width = c.height = OUT;
    const ctx = c.getContext('2d')!;
    compose(ctx, 1, false);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unseen.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    setDone(true);
    uiTick(1.4);
  };

  const cursorFor: Record<Mode, string> = {
    none: 'default',
    pan: 'grab',
    pinch: 'grabbing',
    move: 'move',
    rotate: 'alias',
    resize: 'nwse-resize',
    'resize-w': 'ew-resize',
    'resize-h': 'ns-resize',
  };

  return (
    <Section id="redact" labelledBy="redact-title" wide>
      <Window
        title={redactor.topline}
        eyebrow={redactor.eyebrow}
        heading={redactor.title}
        headingId="redact-title"
        lead={<p className="prose mt-5 max-w-[48ch] lowercase">{redactor.intro}</p>}
        onClose={reset}
        closeLabel="Close and reset the redactor"
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Stage */}
          <div
            className="relative p-3 sm:p-6"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div ref={wrapRef} className="relative mx-auto aspect-square w-full max-w-[600px] border border-paper" data-lenis-prevent>
              <canvas
                ref={canvasRef}
                tabIndex={hasImage ? 0 : -1}
                role="img"
                aria-label="Redactor preview. Drag the bar to move it, drag its handles to resize or rotate, drag the photo to pan, scroll or pinch to zoom. Keyboard: arrows move the bar, plus and minus zoom, brackets rotate."
                className="absolute inset-0 h-full w-full touch-none select-none"
                style={{ '--native-cursor': hasImage ? cursorFor[cursorMode] : 'default', visibility: hasImage ? 'visible' : 'hidden' } as CSSProperties}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
                data-cursor="native"
              />
              {!hasImage && (
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-6 p-6 text-center ${dragOver ? 'dither' : ''}`}>
                  <div aria-hidden="true" className="h-4 w-28 bg-paper shadow-[0_0_14px_rgb(var(--paper)/0.6)]" />
                  <p className="label phos">{loading ? 'DEVELOPING…' : 'DROP AN IMAGE HERE'}</p>
                  <button type="button" className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={loading}>
                    UPLOAD IMAGE <span className="arw" aria-hidden="true">→</span>
                  </button>
                  <p className="label text-[13px]">JPG · PNG · WEBP · STAYS ON THIS DEVICE</p>
                  {error && (
                    <p role="alert" className="label phos">
                      {error}
                    </p>
                  )}
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            {hasImage && <p className="label mt-4 text-center text-[13px]">DRAG BAR · HANDLES RESIZE / ROTATE · DRAG PHOTO TO PAN · SCROLL / PINCH TO ZOOM</p>}
          </div>

          {/* Controls */}
          <div className="relative flex flex-col gap-6 p-4 sm:p-6">
            <span aria-hidden="true" className="rule-t absolute inset-x-0 top-0 h-px lg:hidden" />
            <span aria-hidden="true" className="rule-l absolute inset-y-0 left-0 hidden w-px lg:block" />
            <fieldset disabled={!hasImage} className="space-y-4 disabled:opacity-40">
              <legend className="label phos mb-4">ADJUST</legend>
              {(
                [
                  ['zoom', 'ZOOM', 1, MAX_ZOOM, 0.01, ui.zoom.toFixed(2) + '×'],
                  ['w', 'BAR WIDTH', 40, 1400, 1, `${ui.w}`],
                  ['h', 'BAR HEIGHT', 12, 600, 1, `${ui.h}`],
                  ['rot', 'ROTATION', -90, 90, 1, `${ui.rot}°`],
                ] as const
              ).map(([k, label, min, max, step, out]) => (
                <label key={k} className="block">
                  <span className="label flex justify-between text-[15px]">
                    <span>{label}</span>
                    <span className="phos tabular-nums">{out}</span>
                  </span>
                  <input type="range" min={min} max={max} step={step} value={ui[k]} onChange={setSlider(k)} onPointerUp={syncUi} className="range mt-1 w-full" />
                </label>
              ))}
            </fieldset>

            <fieldset disabled={!hasImage} className="disabled:opacity-40">
              <legend className="label phos mb-2">LAYERS</legend>
              {(
                [
                  ['stamp', 'ADD $███ STAMP'],
                  ['grain', 'GRAIN'],
                  ['mono', 'MONOCHROME'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="rule-b label flex min-h-[42px] cursor-pointer items-center justify-between gap-4 text-[15px]">
                  <span>
                    <Blocks text={label} label={label.replace('$███', 'ticker')} />
                  </span>
                  <input type="checkbox" className="switch" checked={toggles[k]} onChange={setToggle(k)} />
                </label>
              ))}
            </fieldset>

            <div className="mt-auto space-y-3">
              <div className="flex gap-2">
                <button type="button" className="btn btn-primary flex-1" onClick={download} disabled={!hasImage}>
                  DOWNLOAD PNG
                </button>
                <button type="button" className="btn" onClick={reset} disabled={!hasImage}>
                  RESET
                </button>
              </div>
              {hasImage && (
                <button type="button" className="label link-u text-[14px]" onClick={() => fileRef.current?.click()}>
                  USE ANOTHER IMAGE
                </button>
              )}
              <p className="text-[18px] lowercase">{redactor.notice}</p>
              <div aria-live="polite">
                {done && (
                  <div className="win" style={{ animation: 'toast-in 380ms cubic-bezier(.16,1,.3,1)' }}>
                    <div className="border border-paper p-4">
                      <p className="phos text-[20px] lowercase">{redactor.done}</p>
                      <a className="btn btn-sm mt-3" href={shareToX(redactor.share)} target="_blank" rel="noopener noreferrer">
                        SHARE TO X
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Window>
    </Section>
  );
}
