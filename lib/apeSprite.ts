/**
 * The Blind Ape, as a 1-bit pixel sprite, walking with its white cane.
 * Drawn from the token logo: a young monkey standing upright, round head with
 * two big round ears, a black bar across the eyes, slim body with a paler chest,
 * holding a folding cane (dark grip, strap loop, banded shaft, ball tip).
 * In two colours the dark grip and the band are dithered.
 *
 * Cells: 0 empty · 1 white · 2 dither (white on alternate pixels).
 */

export const SPRITE_W = 38;
export const SPRITE_H = 42;
export const GROUND = SPRITE_H - 1;
export const FRAMES = 8;

type Grid = Uint8Array;
const at = (x: number, y: number) => y * SPRITE_W + x;

function set(g: Grid, x: number, y: number, v = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= SPRITE_W || y >= SPRITE_H) return;
  g[at(x, y)] = v;
}
function disc(g: Grid, cx: number, cy: number, r: number, v = 1) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + 0.3) set(g, x, y, v);
}
function oval(g: Grid, cx: number, cy: number, rx: number, ry: number, v = 1) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.05) set(g, x, y, v);
}
/** Bresenham, optional thickness (adds the pixel to the right/below). */
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, v = 1, thick = 1) {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    set(g, x0, y0, v);
    if (thick > 1) {
      set(g, x0 + 1, y0, v);
      if (thick > 2) set(g, x0, y0 + 1, v);
    }
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Points along a line, for the banded cane. */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/**
 * One frame of the walk. f in [0, FRAMES). The stride: frames 0–3 the cane tip
 * is planted and slides back as the body passes it; 4–7 it lifts and swings
 * forward. Legs alternate across the same cycle.
 */
export function apeFrame(f: number): Grid {
  const g: Grid = new Uint8Array(SPRITE_W * SPRITE_H);
  const ph = (f % FRAMES) / FRAMES; // 0..1
  const s = Math.sin(ph * Math.PI * 2);
  const c = Math.cos(ph * Math.PI * 2);
  const bob = Math.abs(c) > 0.7 ? 0 : 1; // body rises as the legs pass
  const by = -bob;

  // ── tail (behind the body), curling up and back, swaying ──
  const tw = Math.round(s);
  line(g, 9, 30 + by, 6, 32 + by);
  line(g, 6, 32 + by, 3, 31 + by);
  line(g, 3, 31 + by, 2, 28 + by + tw);
  line(g, 2, 28 + by + tw, 3, 25 + by + tw);

  // ── legs: hips → knees → feet, alternating ──
  const legs = [s, -s];
  legs.forEach((k, i) => {
    const hipX = 13 + i * 4;
    const hipY = 31 + by;
    const footX = hipX + k * 4;
    const lift = Math.max(0, (i === 0 ? c : -c)) > 0.4 ? 2 : 0; // the swinging leg clears the ground
    const footY = GROUND - lift;
    const kneeX = (hipX + footX) / 2 + 1;
    const kneeY = (hipY + footY) / 2 - (lift ? 1 : 0);
    line(g, hipX, hipY, kneeX, kneeY, 1, 2);
    line(g, kneeX, kneeY, footX, footY, 1, 2);
    line(g, footX, footY, footX + 3, footY); // foot points the way it walks
  });

  // ── body: slim, upright, paler chest (dither) ──
  oval(g, 15, 25 + by, 5, 7);
  oval(g, 15.5, 25.5 + by, 2.2, 3.4, 2);

  // ── back arm, swinging opposite the near leg ──
  const ax = 9 - s * 3;
  line(g, 11, 19 + by, ax, 25 + by, 1, 2);
  line(g, ax, 25 + by, ax - 1, 29 + by, 1, 2);
  disc(g, ax - 1, 30 + by, 1);

  // ── head: round, front-facing, two big round ears ──
  disc(g, 6.5, 10 + by, 3.3); // ears
  disc(g, 23.5, 10 + by, 3.3);
  disc(g, 6.5, 10 + by, 1.4, 2); // inner ear
  disc(g, 23.5, 10 + by, 1.4, 2);
  oval(g, 15, 10.5 + by, 8.2, 7.2); // skull: wide and round, like the logo's
  line(g, 14, 2 + by, 16, 2 + by); // the small tuft on top
  set(g, 15, 1 + by);
  // the bar over the eyes (cut out of the face: black, edge to edge)
  for (let y = 8; y <= 9; y++) for (let x = 9; x <= 21; x++) set(g, x, y + by, 0);
  // muzzle: nostrils + mouth, cut out
  set(g, 14, 12 + by, 0);
  set(g, 16, 12 + by, 0);
  line(g, 13, 14 + by, 17, 14 + by, 0);
  // neck
  line(g, 14, 17 + by, 16, 17 + by);

  // ── cane arm + the cane ──
  const handX = 24;
  const handY = 22 + by;
  line(g, 19, 19 + by, 22, 21 + by, 1, 2); // forearm
  // tip: planted (0..0.5) slides back from 33 → 27; lifted (0.5..1) swings forward again
  let tipX: number;
  let tipY: number;
  if (ph < 0.5) {
    tipX = lerp(34, 28, ph / 0.5);
    tipY = GROUND;
  } else {
    const q = (ph - 0.5) / 0.5;
    tipX = lerp(28, 34, q);
    tipY = GROUND - Math.round(Math.sin(q * Math.PI) * 3);
  }
  // grip above the hand, continuing the shaft's line (dark in the logo → dither)
  const dx = tipX - handX;
  const dy = tipY - handY;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  for (let i = 1; i <= 4; i++) set(g, handX - ux * i, handY - uy * i, 2);
  // strap loop hanging from the grip
  const sx0 = handX - ux * 4;
  const sy0 = handY - uy * 4;
  const sw = Math.round(c);
  line(g, sx0, sy0, sx0 - 2 + sw, sy0 + 4);
  line(g, sx0 - 2 + sw, sy0 + 4, sx0 - 1 + sw, sy0 + 6);
  // shaft with one band (red in the logo → dither)
  const steps = Math.ceil(len);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const band = t > 0.55 && t < 0.68;
    set(g, lerp(handX, tipX, t), lerp(handY, tipY, t), band ? 2 : 1);
  }
  disc(g, tipX, tipY - 0.5, 1); // ball tip
  disc(g, handX, handY, 1.5); // fist over the grip

  return g;
}

/** Where the cane tip touches the ground in a frame (sprite px), or null mid-swing. */
export function tipContact(f: number): number | null {
  const ph = (f % FRAMES) / FRAMES;
  return ph < 0.5 ? lerp(34, 28, ph / 0.5) : null;
}
