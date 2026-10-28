'use client';

import { config } from '@/lib/config';
import { Blocks } from '../Blocks';
import { PixelText } from '../PixelText';
import { Window } from '../Window';
import { LinkBtn, Section } from '../ui';
import { goTo } from '../Taskbar';

const { rewards } = config.copy;

/** Holder rewards: buy, hold, earn — paid in privacy coins. */
export function Rewards() {
  return (
    <Section id="rewards" labelledBy="rewards-title">
      <Window
        title={rewards.topline}
        eyebrow={rewards.eyebrow}
        heading={rewards.title}
        headingId="rewards-title"
        lead={<p className="prose mt-5 max-w-[60ch]">{rewards.lead}</p>}
        foot={
          <>
            <span className="phos">{rewards.note}</span>
            <span className="flex flex-wrap gap-2">
              <LinkBtn href={config.links.pumpfun} primary arrow className="btn-sm" label="Buy on pump.fun">
                BUY
              </LinkBtn>
              <button type="button" className="btn btn-sm" onClick={() => goTo('buy')}>
                HOW TO BUY ↓
              </button>
            </span>
          </>
        }
      >
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* the three steps */}
          <ol className="w-pad">
            {rewards.steps.map(([n, k, d]) => (
              <li key={n} className="rule-b flex gap-5 py-4 last:bg-none">
                <span className="label w-8 shrink-0 pt-1 text-[14px]">{n}</span>
                <div>
                  <PixelText as="h3" text={k} className="phos text-[22px] [filter:drop-shadow(0_0_6px_rgb(var(--paper)/0.4))]" />
                  <p className="mt-2 text-[20px] lowercase">
                    <Blocks text={d} label={d.replace('$███', 'the token')} />
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {/* the three coins */}
          <div className="relative w-pad">
            <span aria-hidden="true" className="rule-t absolute inset-x-0 top-0 h-px lg:hidden" />
            <span aria-hidden="true" className="rule-l absolute inset-y-0 left-0 hidden w-px lg:block" />
            <p className="label mb-4 text-[14px]">PAYOUT CURRENCIES · 3</p>
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {rewards.coins.map(([t, name]) => (
                <li key={t} className="win !p-[3px]">
                  <div className="flex aspect-[4/5] flex-col items-center justify-center gap-4 border border-paper p-2 text-center">
                    <PixelText
                      text={t}
                      label={`${name} (${t})`}
                      className="glitchable glitch-hover text-[clamp(16px,2.4vw,34px)] [filter:drop-shadow(0_0_10px_rgb(var(--paper)/0.5))]"
                    />
                    <span className="label text-[12px] tracking-[0.12em] sm:text-[14px]" aria-hidden="true">
                      {name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Window>
    </Section>
  );
}
