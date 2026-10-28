'use client';

import { config } from '@/lib/config';
import { INTRO_REPLAY } from '../Intro';
import { Blocks } from '../Blocks';
import { PixelText } from '../PixelText';
import { ApeWalker } from '../ApeWalker';

const { footer } = config.copy;

const LINKS: [string, string][] = [
  ['PUMP.FUN', config.links.pumpfun],
  ['DEXSCREENER', config.links.dexscreener],
  ['JUPITER', config.links.jupiter],
  [`X ${config.xHandle.toUpperCase()}`, config.links.x],
];

export function Footer() {
  return (
    <footer className="relative mt-16 pt-20 lg:mt-24 lg:pt-28">
      <span aria-hidden="true" className="rule-t absolute inset-x-0 top-0 h-px" />
      <div className="shell">
        <PixelText
          text={footer.closing}
          className="flick glitchable text-[clamp(34px,8.4vw,128px)] [filter:drop-shadow(0_0_14px_rgb(var(--paper)/0.45))]"
        />

        <div className="mt-16 grid gap-12 md:grid-cols-2 lg:mt-24 [&>*]:min-w-0">
          <nav aria-label="Links">
            <p className="label phos mb-4">CHANNELS</p>
            <ul className="label space-y-2 text-[18px]">
              {LINKS.map(([label, href]) => (
                <li key={label}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="link-u">
                      {label} ↗
                    </a>
                  ) : (
                    <span className="line-through decoration-1">{label}</span>
                  )}
                  {!href && <span className="ml-2 text-[14px]">· SOON</span>}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="label phos mb-4">SYSTEM</p>
            <div className="label flex flex-col items-start gap-2 text-[18px]">
              <button type="button" onClick={() => window.dispatchEvent(new Event(INTRO_REPLAY))} className="link-u">
                REPLAY INTRO
              </button>
              <a href="#top" className="link-u">
                BACK TO THE TOP ↑
              </a>
            </div>
          </div>
        </div>

        <div className="relative mt-16 space-y-4 pt-8 lg:mt-24">
          <span aria-hidden="true" className="rule-t absolute inset-x-0 top-0 h-px" />
          <p className="max-w-[90ch] text-[17px] lowercase leading-[1.5]">
            <Blocks text={footer.disclaimer} label={footer.disclaimer.replace('$███', 'this token')} />
          </p>
          <div className="label flex flex-wrap justify-between gap-4 text-[14px]">
            <p>
              <Blocks text={footer.copyright} label="Copyright redacted. All rights redacted." />
            </p>
            <p>{footer.trackers}</p>
          </div>
        </div>
      </div>
      {/* the ape, walking its cane along the bottom edge */}
      <div className="mt-10 lg:mt-14">
        <ApeWalker />
      </div>
    </footer>
  );
}
