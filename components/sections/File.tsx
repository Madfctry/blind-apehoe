'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { prefersReducedMotion } from '@/lib/store';
import { Redacted, redactedDuration } from '../Redacted';
import { Window } from '../Window';
import { Section } from '../ui';

const { file } = config.copy;
const CPS = 34;
const GAP = 260;

export function File() {
  const box = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setActive(true);
      setDone(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  let t = 0;
  const delays = file.lines.map(([text, r]) => {
    const d = t;
    t += redactedDuration(text, r.length, CPS) + GAP;
    return d;
  });
  const total = t;

  useEffect(() => {
    if (!active) return;
    const id = setTimeout(() => setDone(true), total);
    return () => clearTimeout(id);
  }, [active, total]);

  return (
    <Section id="file" labelledBy="file-title">
      <div ref={box}>
        <Window
          title={file.topline}
          eyebrow={file.eyebrow}
          heading={file.title}
          headingId="file-title"
          headingLabel="Subject: unseen."
          foot={
            <>
              <span className={`transition-opacity duration-700 ${done ? 'opacity-100' : 'opacity-0'}`}>
                END OF FILE · {file.lines.length} LINES · 0 EXPLANATIONS
              </span>
              <span>HOVER A BAR. IT CLOSES AGAIN.</span>
            </>
          }
        >
          <ol className="w-pad">
            {file.lines.map(([text, redact], i) => (
              <li key={text} className="rule-b flex gap-5 py-3.5 last:bg-none sm:gap-8">
                <span className="label w-8 shrink-0 pt-[0.35em] text-[14px]" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Redacted
                  text={text}
                  redact={redact}
                  trigger="manual"
                  active={active}
                  delay={delays[i]}
                  cps={CPS}
                  caret={i === file.lines.length - 1}
                  className={`text-[clamp(22px,2.3vw,32px)] lowercase leading-[1.3] ${i === file.lines.length - 1 ? 'phos' : ''}`}
                />
              </li>
            ))}
          </ol>
        </Window>
      </div>
      <p data-reveal className="label mt-12 text-center text-[14px] tracking-[0.24em]">
        {file.mantra}
      </p>
    </Section>
  );
}
