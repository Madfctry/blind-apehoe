'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { config } from '@/lib/config';
import { formatUsd, getTicks, refreshLive, useLive } from '@/lib/dexscreener';
import {
  RANGES,
  MarketError,
  fetchCandles,
  findPool,
  fmtPct,
  fmtPrice,
  fmtTime,
  mergeLive,
  poolFromPair,
  type Candle,
  type Pool,
  type Range,
} from '@/lib/market';
import { uiTick } from '@/lib/sound';

type Data = { pool: Pool; candles: Candle[]; range: Range; at: number };
type Phase = 'idle' | 'loading' | 'ready' | 'error';

const INTRADAY = new Set(['1H', '6H', '24H']);
const HISTORY_REFRESH_MS = 60_000;
const dash = (s: string) => s.replace('REDACTED', '—');

/** Round, human tick values between lo and hi. */
function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [lo];
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Number(v.toPrecision(12)));
  return out;
}

function nearest(candles: Candle[], t: number) {
  let lo = 0;
  let hi = candles.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (candles[mid].t < t) lo = mid;
    else hi = mid;
  }
  return Math.abs(candles[lo].t - t) <= Math.abs(candles[hi].t - t) ? lo : hi;
}

/**
 * The token's real price, live. DexScreener supplies the live price and market
 * stats every 10s; GeckoTerminal supplies the candle history for the same pair.
 * Live ticks extend the newest candle between history refreshes. Drawn on the
 * tube: a white line, a dithered area, dotted grid, price axis right, UTC below.
 */
export function PriceChart() {
  const uid = useId().replace(/:/g, '');
  const live = useLive();
  const wrap = useRef<HTMLDivElement>(null);
  const plot = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [rangeId, setRangeId] = useState<string>(config.priceData.defaultRange);
  const [phase, setPhase] = useState<Phase>('idle');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);

  const range = RANGES.find((r) => r.id === rangeId) ?? RANGES[2];
  const pair = live.pair;
  const pairAddress = pair?.pairAddress ?? null;
  // Wait for DexScreener's first answer so history comes from the pool it reports.
  const liveSettled = live.status === 'live' || live.status === 'error';

  const currentPair = useRef(pair);
  currentPair.current = pair;

  const load = useCallback(async (r: Range, silent = false) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    if (!silent) setBusy(true);
    setPhase((p) => (p === 'ready' ? p : 'loading'));
    try {
      const lp = currentPair.current;
      const pool = lp ? poolFromPair(lp) : await findPool(ac.signal);
      const candles = await fetchCandles(pool, r, ac.signal, silent ? HISTORY_REFRESH_MS / 2 : 30e3);
      if (ac.signal.aborted) return;
      setData({ pool, candles, range: r, at: Date.now() });
      setPhase('ready');
      setError('');
    } catch (e) {
      if (ac.signal.aborted) return;
      setError(e instanceof MarketError ? e.message : 'history source unreachable');
      setPhase('error');
    } finally {
      if (!ac.signal.aborted) setBusy(false);
    }
  }, []);
  // Start when the chart comes near the viewport; track visibility for refreshes.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (visible && liveSettled) void load(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rangeId, liveSettled, pairAddress, load]);

  // History refresh (volume, any trades the live feed didn't sample).
  useEffect(() => {
    if (!visible || !liveSettled) return;
    const id = setInterval(() => {
      if (!document.hidden) void load(range, true);
    }, HISTORY_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, rangeId, liveSettled, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = plot.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // A tick that moves the price flashes it.
  const lastPrice = useRef<number | null>(null);
  useEffect(() => {
    const p = pair?.priceUsd ?? null;
    if (p !== null && lastPrice.current !== null && p !== lastPrice.current) setFlash((f) => f + 1);
    lastPrice.current = p;
  }, [pair?.priceUsd, live.at]);

  // History + live ticks, for the range on screen.
  const series = useMemo(() => {
    if (!data || !data.candles.length) return null;
    const sameAsLive = pairAddress && data.pool.address === pairAddress;
    return { ...data, candles: sameAsLive ? mergeLive(data.candles, getTicks(), data.range.stepMs) : data.candles };
    // live.at: re-merge after every poll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, pairAddress, live.at]);

  const sr = series?.range ?? range;

  const rangeStats = useMemo(() => {
    if (!series) return null;
    const c = series.candles;
    const first = c[0];
    const last = c[c.length - 1];
    return {
      change: first.o > 0 ? ((last.c - first.o) / first.o) * 100 : null,
      high: Math.max(...c.map((k) => k.h)),
      low: Math.min(...c.map((k) => k.l)),
      last: last.c,
    };
  }, [series]);

  const price = pair?.priceUsd ?? rangeStats?.last ?? null;

  // ───── geometry ─────
  const narrow = width < 640;
  const H = narrow ? 300 : 420;
  const M = { t: narrow ? 46 : 18, r: narrow ? 78 : 104, b: 32, l: 8 };
  const geo = useMemo(() => {
    if (!series || width < 50) return null;
    const c = series.candles;
    const t0 = c[0].t;
    const t1 = c.length > 1 ? c[c.length - 1].t : t0 + series.range.stepMs;
    let lo = Math.min(...c.map((k) => k.c));
    let hi = Math.max(...c.map((k) => k.c));
    if (hi === lo) {
      lo *= 0.98;
      hi *= 1.02;
    }
    const pad = (hi - lo) * 0.08;
    lo = Math.max(0, lo - pad);
    hi += pad;
    const iw = width - M.l - M.r;
    const ih = H - M.t - M.b;
    const x = (t: number) => M.l + (t1 === t0 ? iw : ((t - t0) / (t1 - t0)) * iw);
    const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo)) * ih;
    const pts = c.map((k) => [x(k.t), y(k.c)] as const);
    const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${py.toFixed(1)}`).join('');
    const area = `${line}L${pts[pts.length - 1][0].toFixed(1)} ${M.t + ih}L${pts[0][0].toFixed(1)} ${M.t + ih}Z`;
    const yTicks = niceTicks(lo, hi, narrow ? 4 : 5);
    const nx = narrow ? 3 : 5;
    const xTicks = Array.from({ length: nx }, (_, i) => t0 + ((t1 - t0) * (i + 0.5)) / nx);
    return { x, y, line, area, yTicks, xTicks, iw, ih, t0, t1 };
  }, [series, width, H, M.l, M.r, M.t, M.b, narrow]);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    if (!geo || !series) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = geo.t0 + ((e.clientX - r.left) / geo.iw) * (geo.t1 - geo.t0);
    setHover(nearest(series.candles, t));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!series) return;
    const n = series.candles.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setHover((h) => Math.min(n - 1, Math.max(0, (h ?? n - 1) + (e.key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 10 : 1))));
    } else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
  };

  const pick = (id: string) => {
    if (id === rangeId) return;
    uiTick();
    setHover(null);
    setRangeId(id);
  };
  const retry = () => {
    refreshLive();
    void load(range);
  };

  const hv = series && hover !== null && hover < series.candles.length ? series.candles[hover] : null;
  const withDate = !INTRADAY.has(sr.id);
  const summary =
    price !== null
      ? `Live price ${fmtPrice(price)}.${pair ? ` 24 hour change ${fmtPct(pair.change.h24).replace(/[▲▼] ?/, '')}.` : ''}${
          rangeStats ? ` ${sr.id} high ${fmtPrice(rangeStats.high)}, low ${fmtPrice(rangeStats.low)}.` : ''
        }`
      : '';

  const liveLabel =
    live.status === 'live'
      ? `LIVE · UPDATED ${new Date(live.at).toISOString().slice(11, 19)} UTC`
      : live.status === 'error'
        ? 'LIVE FEED PAUSED · RETRYING'
        : 'SYNCING';

  const txns = pair?.txns24;

  return (
    <div ref={wrap}>
      {/* live stats (DexScreener) */}
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {(
          [
            [pair ? 'PRICE · LIVE' : 'PRICE · LAST CANDLE', fmtPrice(price), 'price'],
            ['CHANGE · 24H', pair ? fmtPct(pair.change.h24) : '—', ''],
            ['MARKET CAP', pair ? dash(formatUsd(pair.marketCap ?? pair.fdv)) : '—', ''],
            ['LIQUIDITY', dash(formatUsd(pair?.liquidityUsd ?? data?.pool.liquidityUsd)), ''],
            ['VOLUME · 24H', pair ? dash(formatUsd(pair.volume24h)) : '—', ''],
            ['TXNS · 24H', txns ? `${txns.buys}B / ${txns.sells}S` : '—', ''],
          ] as const
        ).map(([k, v, kind], i) => (
          <div key={k} className="relative px-4 py-3 sm:px-6">
            {i > 0 && <span aria-hidden="true" className="rule-l absolute inset-y-2 left-0 w-px" />}
            <span aria-hidden="true" className="rule-b absolute inset-x-0 bottom-0 h-px" />
            <dt className="label flex items-center gap-2 text-[13px]">
              {kind === 'price' && live.status === 'live' && <span className="dot blink" aria-hidden="true" />}
              {k}
            </dt>
            <dd
              key={kind === 'price' ? `p${flash}` : undefined}
              className={`phos mt-1 tabular-nums leading-none ${kind === 'price' ? 'tick-flash text-[26px] lg:text-[28px]' : 'text-[22px]'}`}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>

      {/* ranges + range stats + live status */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:px-6">
        <div role="radiogroup" aria-label="Time range" className="flex flex-wrap gap-[3px]">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={r.id === rangeId}
              onClick={() => pick(r.id)}
              className={`label min-h-[36px] min-w-[44px] border border-paper px-2 text-[15px] sm:min-w-[52px] sm:px-3 sm:text-[16px] ${
                r.id === rangeId ? 'bg-paper text-void [text-shadow:none]' : 'hover:bg-paper hover:text-void'
              }`}
            >
              {r.id}
            </button>
          ))}
        </div>
        <div className="label flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] tabular-nums" aria-live="polite">
          {rangeStats && (
            <span>
              {sr.id} <span className="phos">{fmtPct(rangeStats.change)}</span> · H {fmtPrice(rangeStats.high)} · L {fmtPrice(rangeStats.low)}
            </span>
          )}
          <span className="flex items-center gap-2">
            {busy ? (
              <>
                SYNCING<span className="blink">_</span>
              </>
            ) : (
              liveLabel
            )}
          </span>
        </div>
      </div>

      {/* plot */}
      <div
        ref={plot}
        className="relative mx-4 mb-4 mt-3 outline-offset-2 sm:mx-6"
        tabIndex={series ? 0 : -1}
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        aria-label={series ? `Price chart, ${sr.id}. ${summary} Use left and right arrow keys to read candles.` : 'Price chart'}
        role="group"
        data-cursor="native"
        style={{ height: H, ['--native-cursor' as string]: 'crosshair' }}
      >
        <p className="sr-only" aria-live="polite">
          {phase === 'ready' ? summary : ''}
        </p>

        {geo && series && (
          <svg width={width} height={H} className={`block transition-opacity duration-300 ${busy ? 'opacity-40' : ''}`} aria-hidden="true">
            <defs>
              <pattern id={`d-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse">
                <rect width="1" height="1" fill="currentColor" />
              </pattern>
            </defs>
            {geo.yTicks.map((v) => (
              <g key={v}>
                <line x1={M.l} x2={M.l + geo.iw} y1={geo.y(v)} y2={geo.y(v)} stroke="currentColor" strokeDasharray="1 3" strokeOpacity="0.55" />
                <text x={M.l + geo.iw + 8} y={geo.y(v) + 4} fill="currentColor" fontSize="15" fontFamily="var(--font-mono)">
                  {fmtPrice(v)}
                </text>
              </g>
            ))}
            <line x1={M.l} x2={M.l + geo.iw} y1={M.t + geo.ih} y2={M.t + geo.ih} stroke="currentColor" />
            <line x1={M.l + geo.iw} x2={M.l + geo.iw} y1={M.t} y2={M.t + geo.ih} stroke="currentColor" />
            {geo.xTicks.map((t) => (
              <g key={t}>
                <line x1={geo.x(t)} x2={geo.x(t)} y1={M.t + geo.ih} y2={M.t + geo.ih + 5} stroke="currentColor" />
                <text x={geo.x(t)} y={H - 8} textAnchor="middle" fill="currentColor" fontSize="15" fontFamily="var(--font-mono)" letterSpacing="1">
                  {fmtTime(t, withDate, !withDate)}
                </text>
              </g>
            ))}
            <text x={M.l + geo.iw + 8} y={H - 8} fill="currentColor" fontSize="13" fontFamily="var(--font-mono)" letterSpacing="1">
              UTC
            </text>

            <path d={geo.area} fill={`url(#d-${uid})`} />
            <path d={geo.line} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px rgb(var(--paper) / 0.7))' }} />

            {/* the live point */}
            {(() => {
              const last = series.candles[series.candles.length - 1];
              const ly = geo.y(last.c);
              const lx = geo.x(last.t);
              return (
                <g>
                  <line x1={M.l} x2={M.l + geo.iw} y1={ly} y2={ly} stroke="currentColor" strokeDasharray="4 3" />
                  {live.status === 'live' && <rect className="blink" x={lx - 3} y={ly - 3} width="6" height="6" fill="currentColor" />}
                  <rect x={M.l + geo.iw + 1} y={ly - 11} width={M.r - 2} height="22" fill="currentColor" />
                  <text x={M.l + geo.iw + 7} y={ly + 5} fontSize="15" fontFamily="var(--font-mono)" className="fill-void">
                    {fmtPrice(last.c)}
                  </text>
                </g>
              );
            })()}

            {hv && (
              <g>
                <line x1={geo.x(hv.t)} x2={geo.x(hv.t)} y1={M.t} y2={M.t + geo.ih} stroke="currentColor" strokeDasharray="1 2" />
                <line x1={M.l} x2={M.l + geo.iw} y1={geo.y(hv.c)} y2={geo.y(hv.c)} stroke="currentColor" strokeDasharray="1 2" />
                <rect x={geo.x(hv.t) - 4} y={geo.y(hv.c) - 4} width="8" height="8" fill="currentColor" />
              </g>
            )}

            <rect
              x={M.l}
              y={M.t}
              width={geo.iw}
              height={geo.ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={(e) => e.pointerType === 'mouse' && setHover(null)}
              style={{ touchAction: 'pan-y' }}
            />
          </svg>
        )}

        {/* crosshair readout: a compact strip on phones, a full OHLC window on wider screens */}
        {hv && geo && narrow && (
          <div className="win pointer-events-none absolute left-0 top-0 z-[1] !p-[2px]">
            <div className="label border border-paper px-2 py-1 text-[13px] leading-[1.35] tabular-nums">
              <div className="phos">
                {fmtTime(hv.t, true)} · C {fmtPrice(hv.c)}
              </div>
              <div>
                H {fmtPrice(hv.h)} · L {fmtPrice(hv.l)}
              </div>
            </div>
          </div>
        )}
        {hv && geo && !narrow && (
          <div className="win pointer-events-none absolute top-2 z-[1] !p-[2px]" style={geo.x(hv.t) > width / 2 ? { left: M.l + 4 } : { right: M.r + 4 }}>
            <div className="label border border-paper px-3 py-2 text-[14px] leading-[1.45] tabular-nums">
              <div className="phos">{fmtTime(hv.t, true)} UTC</div>
              <div>O {fmtPrice(hv.o)}</div>
              <div>H {fmtPrice(hv.h)}</div>
              <div>L {fmtPrice(hv.l)}</div>
              <div className="phos">C {fmtPrice(hv.c)}</div>
              <div>VOL {hv.v > 0 ? dash(formatUsd(hv.v)) : 'LIVE'}</div>
            </div>
          </div>
        )}

        {/* states */}
        {!data && phase !== 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div aria-hidden="true" className="h-3 w-24 bg-paper shadow-[0_0_14px_rgb(var(--paper)/0.6)]" />
            <p className="label phos">
              ACQUIRING SIGNAL<span className="blink">_</span>
            </p>
          </div>
        )}
        {phase === 'ready' && data && !data.candles.length && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-void text-center">
            <p className="label phos">NO TRADES IN {data.range.id}.</p>
            <p className="label text-[14px]">THE APE WAS QUIET. TRY A LONGER RANGE.</p>
          </div>
        )}
        {phase === 'error' && (
          <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-void px-6 text-center">
            <p className="label phos">{pair ? 'HISTORY UNAVAILABLE.' : 'FEED LOST.'}</p>
            <p className="label text-[14px]">{error.toUpperCase()}.</p>
            {pair && <p className="label text-[14px]">LIVE PRICE ABOVE IS STILL UPDATING.</p>}
            <div className="flex flex-wrap justify-center gap-2">
              <button type="button" className="btn btn-sm" onClick={retry}>
                RETRY
              </button>
              <a className="btn btn-sm" href={pair?.url ?? config.links.dexscreener} target="_blank" rel="noopener noreferrer">
                OPEN ON DEXSCREENER ↗
              </a>
            </div>
          </div>
        )}
      </div>

      {/* source */}
      <p className="label px-4 pb-1 text-[13px] sm:px-6">
        {config.copy.chart.source}
        {(pair || data?.pool) && (
          <>
            {' · '}
            {(pair?.dexId || data?.pool.dex || '').toUpperCase()}
            {' POOL '}
            {(pairAddress ?? data!.pool.address).slice(0, 4)}…{(pairAddress ?? data!.pool.address).slice(-4)}
          </>
        )}
        {' · USD'}
        {live.status === 'error' && <> · LIVE: {live.error.toUpperCase()}</>}
      </p>
    </div>
  );
}
