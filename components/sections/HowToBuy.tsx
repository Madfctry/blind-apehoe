'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { config } from '@/lib/config';
import { prefersReducedMotion } from '@/lib/store';
import { Redacted } from '../Redacted';
import { CopyCA } from '../CopyCA';
import { Window } from '../Window';
import { Section, LinkBtn } from '../ui';

const { howToBuy } = config.copy;
const CPS = 18;

export function HowToBuy() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return setActive(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Each row starts after the previous one finished typing.
  let t = 200;
  const rows = howToBuy.steps.map(([n, step, desc]) => {
    const d = { n: t, step: t + 2 * CPS + 60, desc: t + (2 + step.length) * CPS + 140 };
    t = d.desc + desc.length * CPS + 220;
    return { n, step, desc, d };
  });
  const end = t;

  return (
    <Section id="buy" labelledBy="buy-title">
      <div ref={ref}>
        <Window
          title={howToBuy.topline}
          eyebrow={howToBuy.eyebrow}
          heading={howToBuy.title}
          headingId="buy-title"
          foot={
            <span className="flex items-center gap-2 normal-case transition-opacity duration-500" style={{ opacity: active ? 1 : 0, transitionDelay: `${end}ms` } as CSSProperties}>
              ~/ape $ <span className="caret-block h-[0.9em] w-[0.5em] bg-paper" aria-hidden="true" />
              <span className="sr-only">end of procedure</span>
            </span>
          }
        >
          <ol className="w-pad text-[20px] lg:text-[22px]">
            {rows.map(({ n, step, desc, d }, i) => (
              <li
                key={n}
                className="rule-b grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 py-4 last:bg-none md:grid-cols-[3rem_13rem_minmax(0,1fr)_auto] md:items-center md:gap-x-6"
              >
                <Redacted text={n} trigger="manual" active={active} delay={d.n} cps={CPS} className="label text-[15px]" />
                <Redacted text={step} trigger="manual" active={active} delay={d.step} cps={CPS} className="phos uppercase tracking-[0.08em]" />
                <Redacted
                  text={desc}
                  trigger="manual"
                  active={active}
                  delay={d.desc}
                  cps={CPS}
                  className={`col-start-2 md:col-start-auto ${i === 3 ? 'rd-break break-all' : 'lowercase'}`}
                />
                <div className="col-start-2 mt-2 md:col-start-auto md:mt-0">
                  {i === 3 && <CopyCA variant="compact" />}
                  {i === 2 && (
                    <span className="flex gap-2">
                      <LinkBtn href={config.links.pumpfun} className="btn-sm">
                        PUMP.FUN
                      </LinkBtn>
                      <LinkBtn href={config.links.jupiter} className="btn-sm">
                        JUPITER
                      </LinkBtn>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Window>
      </div>
    </Section>
  );
}
