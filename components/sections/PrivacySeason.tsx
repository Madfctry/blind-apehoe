'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { config } from '@/lib/config';
import { prefersReducedMotion } from '@/lib/store';
import { loadMotion, whenIdle } from '@/lib/motion';
import { PixelText } from '../PixelText';
import { Window } from '../Window';
import { Section } from '../ui';

const { privacy } = config.copy;
const INK = 'rgb(var(--paper))';

/** Tiny, quiet diagrams — one per cell. White lines only. */
function Motif({ i }: { i: number }) {
  if (i === 0)
    // a face-scan frame with nobody in it
    return (
      <svg viewBox="0 0 160 120" className="h-full w-full" fill="none" shapeRendering="crispEdges" aria-hidden="true">
        <path d="M40 20h-14v14M120 20h14v14M40 100h-14V86M120 100h14V86" stroke={INK} />
        <ellipse cx="80" cy="60" rx="22" ry="28" stroke={INK} strokeDasharray="1 3" />
        <rect className="ps-scan" x="26" y="20" width="108" height="1" fill={INK} />
        <text x="80" y="116" textAnchor="middle" fill={INK} fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2">
          NO MATCH
        </text>
      </svg>
    );
  if (i === 1)
    // a form that never gets filled
    return (
      <svg viewBox="0 0 160 120" className="h-full w-full" fill="none" shapeRendering="crispEdges" aria-hidden="true">
        {['NAME', 'HANDLE', 'FACE', 'WALLET'].map((f, k) => (
          <g key={f} transform={`translate(14 ${16 + k * 24})`}>
            <text y="8" fill={INK} fontSize="9" fontFamily="var(--font-mono)" letterSpacing="1">
              {f}
            </text>
            <path d="M50 9h82" stroke={INK} strokeDasharray="1 2" />
            <rect className="ps-caret" x="52" y="0" width="5" height="9" fill={INK} style={{ animationDelay: `${k * 0.35}s` }} />
          </g>
        ))}
      </svg>
    );
  // nothing. a bar.
  return (
    <svg viewBox="0 0 160 120" className="h-full w-full" aria-hidden="true">
      <rect x="22" y="52" width="116" height="16" fill={INK} style={{ filter: 'drop-shadow(0 0 6px rgb(255 255 255 / .5))' }} />
    </svg>
  );
}

export function PrivacySeason() {
  const closing = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = closing.current;
    if (!el || prefersReducedMotion()) return;
    let revert = () => {};
    let dead = false;
    const cancel = whenIdle(async () => {
      const { gsap } = await loadMotion();
      if (dead) return;
      const ctx = gsap.context(() => {
        gsap.fromTo(
          el.querySelectorAll('.px-word'),
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: 'none',
            scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 50%', scrub: 0.6 },
          },
        );
      }, el);
      revert = () => ctx.revert();
    });
    return () => {
      dead = true;
      cancel();
      revert();
    };
  }, []);

  return (
    <Section id="privacy" labelledBy="privacy-title">
      <Window title={privacy.topline} eyebrow={privacy.eyebrow} heading={privacy.title} headingId="privacy-title">
        <ul className="grid md:grid-cols-3">
          {privacy.cards.map((c, i) => (
            <li
              key={c.n}
              className="relative flex flex-col p-5 md:min-h-[400px] md:p-7"
              style={{ '--rd': `${i * 120}ms` } as CSSProperties}
            >
              {i > 0 && (
                <>
                  <span aria-hidden="true" className="rule-t absolute inset-x-0 top-0 h-px md:hidden" />
                  <span aria-hidden="true" className="rule-l absolute inset-y-0 left-0 hidden w-px md:block" />
                </>
              )}
              <div className="label flex justify-between text-[14px]">
                <span>{c.n} / 03</span>
                <span className={i === 2 ? 'phos' : ''}>{i === 2 ? 'DELIVERED' : 'REQUESTED'}</span>
              </div>
              <div className="my-auto h-32 w-full py-6 lg:h-40">
                <Motif i={i} />
              </div>
              <PixelText
                as="h3"
                text={c.title}
                label={i === 2 ? 'THE APE GAVE THEM NOTHING.' : undefined}
                className="glitch-hover text-[clamp(20px,2.1vw,28px)] [filter:drop-shadow(0_0_6px_rgb(var(--paper)/0.35))]"
              />
              <p className="mt-3 text-[18px] lowercase">{c.caption}</p>
            </li>
          ))}
        </ul>
        <div ref={closing} className="rule-t w-pad">
          <PixelText text={privacy.closing} className="py-4 text-[clamp(22px,3.6vw,52px)] [filter:drop-shadow(0_0_10px_rgb(var(--paper)/0.4))]" />
        </div>
      </Window>
    </Section>
  );
}
