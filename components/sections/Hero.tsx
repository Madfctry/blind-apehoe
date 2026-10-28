'use client';

import { useEffect, useRef, useState } from 'react';
import { config } from '@/lib/config';
import { prefersReducedMotion, toast } from '@/lib/store';
import { uiTick } from '@/lib/sound';
import { loadMotion, whenIdle } from '@/lib/motion';
import { CopyCA } from '../CopyCA';
import { Blocks } from '../Blocks';
import { PixelText } from '../PixelText';
import { LinkBtn } from '../ui';
import { Rain } from '../Rain';

const { hero, status } = config.copy;
const { links } = config;

/** $███ in pixels. The bars hide a secret: click them seven times. */
function PixelTicker() {
  const [slip, setSlip] = useState(false);
  const clicks = useRef(0);
  const onClick = () => {
    clicks.current += 1;
    uiTick(0.7 + clicks.current * 0.08);
    if (clicks.current >= 7) {
      clicks.current = 0;
      setSlip(true);
      setTimeout(() => setSlip(false), 200);
      toast(config.copy.eggs.bars);
    }
  };
  return (
    <div className="flex items-center justify-center gap-[0.43em] text-[clamp(26px,4.4vw,60px)]">
      <PixelText text="$" label="ticker: dollar sign" className="phos" />
      <button
        type="button"
        onClick={onClick}
        aria-label="Ticker: three redaction bars. They stay."
        data-cursor="bar"
        className="relative block"
      >
        {/* the bar under the bar: only there when the top one slips */}
        <span aria-hidden="true" className="absolute inset-0" style={{ opacity: slip ? 1 : 0 }}>
          <PixelText text="███" label="" />
        </span>
        <span
          className="relative block"
          style={{
            transform: slip ? 'translate(10%, -55%) rotate(-5deg)' : 'none',
            transition: 'transform 90ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <PixelText text="███" label="" />
        </span>
      </button>
    </div>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // Scroll: the stage loses sight. (GSAP arrives after idle.)
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    let revert = () => {};
    let dead = false;
    const cancel = whenIdle(async () => {
      const { gsap } = await loadMotion();
      if (dead) return;
      const ctx = gsap.context(() => {
        const st = { trigger: el, start: 'top top', end: 'bottom top', scrub: true };
        gsap.to('[data-hero-mark]', { yPercent: -18, ease: 'none', scrollTrigger: st });
        gsap.to('[data-hero-dim]', { opacity: 0.9, ease: 'none', scrollTrigger: st });
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
    <section
      ref={root}
      id="top"
      aria-labelledby="hero-title"
      className="relative flex min-h-[calc(100svh-var(--tb))] flex-col overflow-hidden"
    >
      <Rain className="absolute inset-0 h-full w-full opacity-[0.22]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgb(var(--void)/0.92) 0%, rgb(var(--void)/0.6) 38%, transparent 75%)' }}
      />

      {/* header: brand left, status right */}
      <header className="relative z-[1] flex items-start justify-between gap-6 px-[var(--gutter)] pt-6 lg:pt-9">
        <div>
          <div className="label phos flex items-center gap-3 text-[18px] font-bold tracking-[0.3em] lg:text-[20px]">
            <span aria-hidden="true" className="block h-[7px] w-[16px] bg-paper shadow-[0_0_10px_rgb(var(--paper)/0.7)]" />
            BLIND APE HOE
          </div>
          <div className="label mt-2 pl-[28px] text-[14px] tracking-[0.2em]">
            <Blocks text={hero.edition} label="Ticker redacted. A privacy meme on Solana." />
          </div>
        </div>
        <div className="label hidden text-right text-[14px] leading-[1.6] tracking-[0.18em] sm:block">
          <div className="flex items-center justify-end gap-2">
            <span className="dot blink" aria-hidden="true" />
            <Blocks text={status.node} label="Node redacted" /> <span className="phos">{status.online}</span>
          </div>
          <div>SESSION · SEALED</div>
          <div className="phos">{status.center}</div>
        </div>
      </header>

      {/* caption, left (wide screens) */}
      <div className="label absolute left-[var(--gutter)] top-[50%] z-[1] hidden text-[15px] tracking-[0.2em] xl:[@media(min-height:820px)]:block">
        <div className="mb-5">
          <Blocks text={hero.index} label="Node redacted, the archive" />
        </div>
        <p className="leading-[1.8]">
          {hero.caption.map((l, i) => (
            <span key={l} className={`block ${i === hero.caption.length - 1 ? 'phos' : ''}`}>
              {l}
            </span>
          ))}
        </p>
        <div className="my-5 h-px w-8 bg-paper" aria-hidden="true" />
        <p className="text-[13px] leading-[1.7] tracking-[0.14em]">
          {hero.small.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </p>
      </div>
      <div className="side-v label absolute right-[var(--gutter)] top-[48%] z-[1] hidden text-[13px] tracking-[0.35em] xl:[@media(min-height:820px)]:block">{hero.side}</div>

      {/* the name */}
      <div data-hero-mark className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-6 px-[var(--gutter)] py-14 text-center lg:gap-8">
        <p className="label phos tracking-[0.48em]">FILE 00 · SUBJECT UNKNOWN</p>
        <h1 id="hero-title" className="flick">
          <PixelText
            text="BLIND APE HOE"
            label="BLIND APE HOE"
            className="glitchable glitch-hover text-[clamp(30px,8.6vw,132px)] [filter:drop-shadow(0_0_16px_rgb(var(--paper)/0.45))]"
          />
        </h1>
        <PixelTicker />
        <p className="prose max-w-[44ch] lowercase">no eyes. no identity. no explanation.</p>
      </div>

      {/* footer: stats left, actions right */}
      <div className="relative z-[1] flex flex-col-reverse gap-8 px-[var(--gutter)] pb-8 lg:flex-row lg:items-end lg:justify-between lg:pb-9">
        <dl className="flex flex-wrap items-end gap-y-4">
          {hero.stats.map(([v, k], i) => (
            <div key={k} className={`pr-6 ${i ? 'rule-l pl-6' : ''} lg:pr-8 ${i ? 'lg:pl-8' : ''}`}>
              <dd className="phos text-[26px] leading-none tracking-[-0.02em] lg:text-[30px]">{v}</dd>
              <dt className="label mt-2 text-[13px] tracking-[0.19em]">{k}</dt>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <LinkBtn href={links.pumpfun} primary arrow className="w-full sm:w-auto" label="Buy on pump.fun">
              BUY ON PUMP.FUN
            </LinkBtn>
            <LinkBtn href={links.dexscreener} className="flex-1 sm:flex-none" label="Chart on DexScreener">
              CHART
            </LinkBtn>
            <LinkBtn href={links.x} className="flex-1 sm:flex-none" label={`${config.xHandle} on X`}>
              X
            </LinkBtn>
          </div>
          <div className="w-full max-w-[460px]">
            <CopyCA variant="chip" />
          </div>
          <p className="label text-[13px] tracking-[0.14em]">{hero.hint}</p>
        </div>
      </div>
      <div data-hero-dim aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] bg-void opacity-0" />
    </section>
  );
}
