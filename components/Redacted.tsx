'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType } from 'react';
import { prefersReducedMotion } from '@/lib/store';

type RedactSpec = number[] | `random:${number}`;

export type RedactedProps = {
  text: string;
  /** Word indexes to bar out, or "random:n" (deterministic per text, so SSR == client). */
  redact?: RedactSpec;
  /** inView: types when scrolled into view · mount: types immediately · manual: obeys `active`. */
  trigger?: 'inView' | 'mount' | 'manual';
  active?: boolean;
  /** Hover / tap lifts a bar for 1.2s. */
  reveal?: boolean;
  /** Delay before typing starts (ms). */
  delay?: number;
  /** ms per character (30–45 looks right). */
  cps?: number;
  caret?: boolean;
  as?: ElementType;
  className?: string;
  onDone?: () => void;
};

/** Total time a line takes to type + bar, so callers can sequence lines. */
export function redactedDuration(text: string, redactCount: number, cps = 35) {
  return text.length * cps + 160 + redactCount * 90 + 300;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function resolve(spec: RedactSpec | undefined, words: string[], text: string): Set<number> {
  if (!spec) return new Set();
  if (Array.isArray(spec)) return new Set(spec);
  const n = Math.min(Number(spec.split(':')[1]) || 0, words.length);
  let seed = hash(text) || 1;
  const rand = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ 0x9e3779b9) >>> 0) / 4294967296;
  const pool = words.map((_, i) => i).filter((i) => words[i].replace(/[^\w]/g, '').length > 2);
  const out = new Set<number>();
  while (out.size < Math.min(n, pool.length)) out.add(pool[Math.floor(rand() * pool.length)]);
  return out;
}

export function Redacted({
  text,
  redact,
  trigger = 'inView',
  active,
  reveal = true,
  delay = 0,
  cps = 35,
  caret = false,
  as: Tag = 'span',
  className = '',
  onDone,
}: RedactedProps) {
  const ref = useRef<HTMLElement>(null);
  const [on, setOn] = useState(false);
  const [final, setFinal] = useState(false);
  const words = useMemo(() => text.split(' '), [text]);
  const redacted = useMemo(() => resolve(redact, words, text), [redact, words, text]);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Trigger
  useEffect(() => {
    if (prefersReducedMotion()) {
      setFinal(true);
      doneRef.current?.();
      return;
    }
    if (trigger === 'mount') {
      setOn(true);
      return;
    }
    if (trigger === 'manual') {
      setOn(!!active);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [trigger, active]);

  // onDone
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => doneRef.current?.(), delay + redactedDuration(text, redacted.size, cps));
    return () => clearTimeout(t);
  }, [on, delay, text, redacted.size, cps]);

  // Peek: lift a bar for 1.2s on hover / tap.
  useEffect(() => {
    const el = ref.current;
    if (!el || !reveal || !redacted.size) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const peek = (e: Event) => {
      const w = (e.target as Element | null)?.closest?.('.rd-w[data-r]');
      if (!w || !el.contains(w)) return;
      w.classList.add('peek');
      clearTimeout(timers.get(w));
      timers.set(
        w,
        setTimeout(() => w.classList.remove('peek'), 1200),
      );
    };
    el.addEventListener('pointerover', peek);
    el.addEventListener('click', peek);
    return () => {
      el.removeEventListener('pointerover', peek);
      el.removeEventListener('click', peek);
      timers.forEach((t) => clearTimeout(t));
    };
  }, [reveal, redacted.size]);

  let idx = 0;
  let r = 0;
  const typedEnd = delay + text.length * cps;
  const barBase = typedEnd + 160;

  return (
    <Tag
      ref={ref}
      className={`rd ${on ? 'on' : ''} ${final ? 'final' : ''} ${className}`}
      style={{ '--d': `${delay}ms`, '--cps': `${cps}ms`, '--cd': `${typedEnd}ms` } as CSSProperties}
    >
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, wi) => {
          const isR = redacted.has(wi);
          const chars = Array.from(w);
          const node = (
            <span
              key={wi}
              className="rd-w"
              data-r={isR ? '' : undefined}
              style={isR ? ({ '--bd': `${barBase + r++ * 90}ms` } as CSSProperties) : undefined}
            >
              {chars.map((c) => {
                const i = idx++;
                return (
                  <span key={i} className="rd-c" style={{ '--i': i } as CSSProperties}>
                    {c === '█' ? <span className="blk" /> : c}
                  </span>
                );
              })}
              {isR && <span className="rd-bar" />}
            </span>
          );
          idx++; // the space
          return wi < words.length - 1 ? [node, ' '] : node;
        })}
        {caret && <span className="rd-caret" />}
      </span>
    </Tag>
  );
}
