'use client';

import { config } from '@/lib/config';
import { PriceChart } from '../PriceChart';
import { Window } from '../Window';
import { Section } from '../ui';

const { chart } = config.copy;

/** FILE 06: the real price history. They watch us. We watch this. */
export function Chart() {
  return (
    <Section id="chart" labelledBy="chart-title" wide>
      <Window
        title={chart.topline}
        eyebrow={chart.eyebrow}
        heading={chart.title}
        headingId="chart-title"
        foot={
          <>
            <span className="flex items-center gap-2">
              <span className="dot blink" aria-hidden="true" />
              LIVE PRICE EVERY 10S · HISTORY EVERY 60S · UTC
            </span>
            <a href={config.links.dexscreener} target="_blank" rel="noopener noreferrer" className="link-u phos">
              OPEN ON DEXSCREENER ↗
            </a>
          </>
        }
      >
        <PriceChart />
      </Window>
    </Section>
  );
}
