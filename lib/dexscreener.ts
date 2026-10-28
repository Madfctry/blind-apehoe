'use client';

import { useSyncExternalStore } from 'react';
import { config } from './config';

/**
 * Live market feed from DexScreener's public API (documented, no key,
 * 300 req/min). One poller for the whole page, shared by every subscriber:
 *
 *   GET https://api.dexscreener.com/tokens/v1/solana/{CA}  → pairs for this token
 *
 * Only pairs whose BASE token is our contract address are used; the deepest one
 * wins (PumpSwap preferred on a tie). Every successful poll is recorded as a
 * real price tick so the chart can extend its latest candle live.
 */

export type LivePair = {
  pairAddress: string;
  dexId: string;
  url: string;
  priceUsd: number;
  marketCap: number | null;
  fdv: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  change: { m5: number | null; h1: number | null; h6: number | null; h24: number | null };
  txns24: { buys: number; sells: number } | null;
};

export type LiveState = {
  status: 'idle' | 'loading' | 'live' | 'error';
  pair: LivePair | null;
  /** ms epoch of the last successful poll */
  at: number;
  error: string;
};

export type Tick = { t: number; p: number };

type PairJSON = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
};

const n = (v: unknown): number | null => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(x) ? x : null;
};

let state: LiveState = { status: 'idle', pair: null, at: 0, error: '' };
const listeners = new Set<() => void>();
const ticks: Tick[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let inflight: AbortController | null = null;

const emit = (patch: Partial<LiveState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

/** Pick the token's pair from a DexScreener answer. Exported for tests. */
export function pickPair(json: unknown, ca: string = config.ca): LivePair | null {
  const list: PairJSON[] = Array.isArray(json) ? json : Array.isArray((json as { pairs?: unknown })?.pairs) ? (json as { pairs: PairJSON[] }).pairs : [];
  const ours = list
    .filter((p) => p.chainId === 'solana' && p.baseToken?.address === ca && p.pairAddress && n(p.priceUsd) !== null && (n(p.priceUsd) as number) > 0)
    .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0) || (b.dexId === 'pumpswap' ? 1 : 0) - (a.dexId === 'pumpswap' ? 1 : 0));
  const p = ours[0];
  if (!p) return null;
  return {
    pairAddress: p.pairAddress!,
    dexId: p.dexId ?? '',
    url: p.url ?? config.links.dexscreener,
    priceUsd: n(p.priceUsd)!,
    marketCap: n(p.marketCap),
    fdv: n(p.fdv),
    liquidityUsd: n(p.liquidity?.usd),
    volume24h: n(p.volume?.h24),
    change: { m5: n(p.priceChange?.m5), h1: n(p.priceChange?.h1), h6: n(p.priceChange?.h6), h24: n(p.priceChange?.h24) },
    txns24: p.txns?.h24 ? { buys: n(p.txns.h24.buys) ?? 0, sells: n(p.txns.h24.sells) ?? 0 } : null,
  };
}

async function poll() {
  inflight?.abort();
  const ctrl = new AbortController();
  inflight = ctrl;
  const t = setTimeout(() => ctrl.abort(), config.api.timeoutMs);
  if (state.status === 'idle') emit({ status: 'loading' });
  try {
    const res = await fetch(config.api.dexscreener, { signal: ctrl.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
    if (res.status === 429) throw new Error('rate limited by dexscreener');
    if (!res.ok) throw new Error(`dexscreener answered ${res.status}`);
    const pair = pickPair(await res.json());
    if (!pair) throw new Error('no dexscreener pair for this contract yet');
    const now = Date.now();
    if (!ticks.length || ticks[ticks.length - 1].p !== pair.priceUsd || now - ticks[ticks.length - 1].t > 30e3) {
      ticks.push({ t: now, p: pair.priceUsd });
      if (ticks.length > 2000) ticks.splice(0, ticks.length - 2000);
    }
    emit({ status: 'live', pair, at: now, error: '' });
  } catch (e) {
    if (inflight !== ctrl) return; // superseded
    const msg = ctrl.signal.aborted ? 'dexscreener timed out' : e instanceof Error && e.message ? e.message : 'dexscreener unreachable';
    emit({ status: 'error', error: msg });
  } finally {
    clearTimeout(t);
  }
}

const onVisible = () => {
  if (!document.hidden) void poll();
};

function start() {
  void poll();
  timer = setInterval(() => {
    if (!document.hidden) void poll();
  }, config.api.refreshMs);
  document.addEventListener('visibilitychange', onVisible);
}
function stop() {
  clearInterval(timer);
  timer = undefined;
  inflight?.abort();
  document.removeEventListener('visibilitychange', onVisible);
}

export function subscribeLive(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) stop();
  };
}

const serverState: LiveState = { status: 'idle', pair: null, at: 0, error: '' };

/** The live market state; subscribing starts the shared poller. */
export function useLive(): LiveState {
  return useSyncExternalStore(subscribeLive, () => state, () => serverState);
}

/** Real price ticks observed since the page opened (oldest first). */
export const getTicks = (): readonly Tick[] => ticks;

/** Force an immediate poll (e.g. a RETRY button). */
export const refreshLive = () => void poll();

export function formatUsd(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return 'REDACTED';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}
