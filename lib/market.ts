import { config } from './config';

/**
 * Price history from GeckoTerminal's public API (no key, CORS-enabled).
 * Real trades only: if the API fails or returns nothing, callers get an
 * error or an empty list — never filler data.
 *
 *   pools:  GET /networks/solana/tokens/{token}/pools
 *   candles GET /networks/solana/pools/{pool}/ohlcv/{day|hour|minute}?aggregate=&limit=&currency=usd&token={token}
 */

export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number }; // t: ms epoch

export type Pool = {
  address: string;
  name: string;
  dex: string;
  priceUsd: number | null;
  liquidityUsd: number | null;
  volume24h: number | null;
  change24h: number | null;
};

export type Range = {
  id: string;
  timeframe: 'minute' | 'hour' | 'day';
  aggregate: number;
  limit: number;
  /** candle width, for gap-aware tooltips */
  stepMs: number;
};

export const RANGES: Range[] = [
  { id: '1H', timeframe: 'minute', aggregate: 1, limit: 60, stepMs: 60e3 },
  { id: '6H', timeframe: 'minute', aggregate: 5, limit: 72, stepMs: 5 * 60e3 },
  { id: '24H', timeframe: 'minute', aggregate: 15, limit: 96, stepMs: 15 * 60e3 },
  { id: '7D', timeframe: 'hour', aggregate: 1, limit: 168, stepMs: 3600e3 },
  { id: '30D', timeframe: 'hour', aggregate: 4, limit: 180, stepMs: 4 * 3600e3 },
  { id: 'ALL', timeframe: 'day', aggregate: 1, limit: 1000, stepMs: 86400e3 },
];

export class MarketError extends Error {
  constructor(
    public kind: 'network' | 'timeout' | 'rate' | 'http' | 'shape' | 'nopool',
    message: string,
  ) {
    super(message);
  }
}

const { base, network, timeoutMs } = config.priceData;
const TOKEN = config.ca;

async function getJSON(url: string, signal?: AbortSignal): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException('timeout', 'TimeoutError')), timeoutMs);
  const onAbort = () => ctrl.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (res.status === 429) throw new MarketError('rate', 'rate limited by the data source');
    if (!res.ok) throw new MarketError('http', `data source answered ${res.status}`);
    return await res.json();
  } catch (e) {
    if (e instanceof MarketError) throw e;
    if (signal?.aborted) throw e;
    if (ctrl.signal.aborted) throw new MarketError('timeout', 'data source timed out');
    throw new MarketError('network', 'data source unreachable');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

type PoolJSON = {
  attributes?: {
    address?: string;
    name?: string;
    reserve_in_usd?: string;
    base_token_price_usd?: string;
    quote_token_price_usd?: string;
    volume_usd?: { h24?: string };
    price_change_percentage?: { h24?: string };
  };
  relationships?: {
    base_token?: { data?: { id?: string } };
    dex?: { data?: { id?: string } };
  };
};

let poolCache: { at: number; pool: Pool } | null = null;

/** The token's deepest pool on Solana (by liquidity). Cached for 5 minutes. */
export async function findPool(signal?: AbortSignal): Promise<Pool> {
  if (poolCache && Date.now() - poolCache.at < 5 * 60e3) return poolCache.pool;
  const json = (await getJSON(`${base}/networks/${network}/tokens/${TOKEN}/pools?page=1`, signal)) as { data?: PoolJSON[] };
  if (!json || !Array.isArray(json.data)) throw new MarketError('shape', 'unexpected answer from the data source');
  const pools = json.data
    .map((p) => {
      const a = p.attributes ?? {};
      if (!a.address) return null;
      const isBase = p.relationships?.base_token?.data?.id === `${network}_${TOKEN}`;
      return {
        address: a.address,
        name: a.name ?? '',
        dex: (p.relationships?.dex?.data?.id ?? '').replace(/[-_]/g, ' '),
        priceUsd: num(isBase ? a.base_token_price_usd : a.quote_token_price_usd),
        liquidityUsd: num(a.reserve_in_usd),
        volume24h: num(a.volume_usd?.h24),
        change24h: num(a.price_change_percentage?.h24),
      } satisfies Pool;
    })
    .filter((p): p is Pool => p !== null)
    .sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0));
  if (!pools.length) throw new MarketError('nopool', 'no trading pool found for this token yet');
  poolCache = { at: Date.now(), pool: pools[0] };
  return pools[0];
}

const candleCache = new Map<string, { at: number; candles: Candle[] }>();

/** OHLCV candles for one range, oldest first, priced in USD for this token. */
export async function fetchCandles(pool: Pool, range: Range, signal?: AbortSignal, maxAgeMs = 30e3): Promise<Candle[]> {
  const key = `${pool.address}:${range.id}`;
  const hit = candleCache.get(key);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.candles;
  const q = new URLSearchParams({ aggregate: String(range.aggregate), limit: String(range.limit), currency: 'usd', token: TOKEN });
  const json = (await getJSON(`${base}/networks/${network}/pools/${pool.address}/ohlcv/${range.timeframe}?${q}`, signal)) as {
    data?: { attributes?: { ohlcv_list?: unknown } };
  };
  const list = json?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(list)) throw new MarketError('shape', 'unexpected answer from the data source');
  const candles: Candle[] = [];
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 6) continue;
    const [t, o, h, l, c, v] = row.map(num);
    if (t === null || o === null || h === null || l === null || c === null || c <= 0) continue;
    candles.push({ t: t * 1000, o, h, l, c, v: v ?? 0 });
  }
  candles.sort((a, b) => a.t - b.t);
  candleCache.set(key, { at: Date.now(), candles });
  return candles;
}

// ───────── formatting ─────────

/** $0.00001234-style prices: always 4 significant digits, never scientific notation. */
export function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  const d = Math.min(18, Math.max(4, 3 - Math.floor(Math.log10(n))));
  return `$${n.toFixed(d)}`;
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${n >= 0 ? '▲ +' : '▼ '}${n.toFixed(2)}%`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const p2 = (n: number) => String(n).padStart(2, '0');

/** UTC, always — no timezone, no location. */
export function fmtTime(ms: number, withDate: boolean, withTime = true): string {
  const d = new Date(ms);
  const date = `${p2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}`;
  const time = `${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`;
  if (withDate && withTime) return `${date} ${time}`;
  return withDate ? date : time;
}

// ───────── live ─────────

/** A candle source for a pair DexScreener reported (Solana pair address = pool address). */
export function poolFromPair(p: { pairAddress: string; dexId: string; priceUsd: number; liquidityUsd: number | null; volume24h: number | null; change: { h24: number | null } }): Pool {
  return {
    address: p.pairAddress,
    name: '',
    dex: p.dexId.replace(/[-_]/g, ' '),
    priceUsd: p.priceUsd,
    liquidityUsd: p.liquidityUsd,
    volume24h: p.volume24h,
    change24h: p.change.h24,
  };
}

/**
 * Fold real live price ticks into the candle series: a tick inside the latest
 * candle's bucket moves its close/high/low; a tick in a later bucket opens a new
 * candle at the previous close. Ticks older than the latest candle are ignored.
 * Volume of live-built candles is unknown until the next history refresh: 0.
 */
export function mergeLive(candles: Candle[], ticks: readonly { t: number; p: number }[], stepMs: number): Candle[] {
  if (!candles.length) return candles;
  const out = candles.slice();
  let last = { ...out[out.length - 1] };
  out[out.length - 1] = last;
  for (const { t, p } of ticks) {
    if (!(p > 0) || t < last.t) continue;
    const bucket = Math.floor(t / stepMs) * stepMs;
    if (bucket <= last.t) {
      last.c = p;
      last.h = Math.max(last.h, p);
      last.l = Math.min(last.l, p);
    } else {
      last = { t: bucket, o: last.c, h: Math.max(last.c, p), l: Math.min(last.c, p), c: p, v: 0 };
      out.push(last);
    }
  }
  return out;
}
