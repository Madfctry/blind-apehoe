'use client';

/**
 * Shared Web Audio graph. Everything is synthesized — no audio files.
 * Muted by default; nothing is created until the visitor turns SOUND ON.
 */
type Audio = { ctx: AudioContext; master: GainNode; noise: AudioBuffer };

let audio: Audio | null = null;
let enabled = false;

export function getAudio(): Audio | null {
  if (typeof window === 'undefined') return null;
  if (audio) return audio;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  // 2s of white noise, reused by every noisy sound.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  audio = { ctx, master, noise };
  return audio;
}

export const soundEnabled = () => enabled;

export function setSoundEnabled(on: boolean) {
  enabled = on;
  const a = on ? getAudio() : audio;
  if (!a) return;
  const t = a.ctx.currentTime;
  if (on && a.ctx.state === 'suspended') void a.ctx.resume();
  a.master.gain.cancelScheduledValues(t);
  a.master.gain.setTargetAtTime(on ? 0.9 : 0, t, 0.08);
}

/** Short dry tick for UI feedback. */
export function uiTick(pitch = 1) {
  if (!enabled) return;
  const a = getAudio();
  if (!a) return;
  const { ctx, master } = a;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.value = 1800 * pitch;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.025, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + 0.05);
}

/** A drone: two detuned low sines + lowpassed noise. Returns a stop fn. */
export function startDrone(level = 0.05, base = 55): () => void {
  const a = getAudio();
  if (!a) return () => {};
  const { ctx, master, noise } = a;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(level, t + 2.5);
  out.connect(master);

  const oscs = [base, base * 1.006, base * 1.5].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = i === 2 ? 0.18 : 0.5;
    o.connect(g).connect(out);
    o.start();
    return o;
  });

  const n = ctx.createBufferSource();
  n.buffer = noise;
  n.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 280;
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  n.connect(lp).connect(ng).connect(out);
  n.start();

  // Slow breathing on the filter.
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 120;
  lfo.connect(lfoGain).connect(lp.frequency);
  lfo.start();

  return () => {
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setTargetAtTime(0, now, 0.4);
    setTimeout(() => {
      [...oscs, n, lfo].forEach((s) => {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      });
      out.disconnect();
    }, 2000);
  };
}
