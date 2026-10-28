# BLIND APE HOE — $███

A blacked-out, classified-archive site for the ape that refuses to be seen.
One phosphor tube, two colours: black ground, white light. Pixel type, CRT
power-on, raster scanlines, glitch tears, windows on a terminal desk.

Next.js (App Router) · TypeScript · Tailwind · GSAP + ScrollTrigger (lazy) · Lenis (desktop) · static export.
No backend. No trackers. No cookies.

---

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # static export → ./out
npm start            # serve ./out locally (gzip, like production)
```

Node 18.18+ (tested on Node 22).

## Edit the content — `lib/config.ts`

Everything a non-developer should touch lives in **one file**:

| What | Where in `config` |
| --- | --- |
| Contract address | `CA` (top of file) — used everywhere |
| Production URL (OG tags, share links) | `siteUrl` — **TODO before deploy** |
| pump.fun / DexScreener / Jupiter / X | `links` — an empty string renders a dashed "· SOON" key |
| Supply / tax line | `supplyLine` |
| Intro boot console + welcome card | `copy.boot`, `copy.welcome` |
| Hero labels, stats row, caption | `copy.hero` |
| Lore lines + which words get redacted | `copy.file.lines` (`[text, [wordIndexes]]`) |
| Privacy Season cells + closing line | `copy.privacy` |
| **Holder rewards (BUY. HOLD. EARN.)** | `copy.rewards` — heading, lead sentence, 3 steps, 3 coins |
| Redactor / how-to-buy / chart copy | `copy.redactor`, `copy.howToBuy`, `copy.chart` |
| Footer + disclaimer | `copy.footer` |
| Feature switches (intro, vision, smooth scroll, eggs) | `features` |
| "Going blind" radius & strength | `vision` |

`█` anywhere in copy renders as a real bar (font-independent), and screen
readers hear "redacted".

> ⚠️ **Disclaimer vs rewards.** The original disclaimer says "no … expectation
> of financial return", which now sits on the same page as a holder-rewards
> section. Have both reviewed together before launch (`copy.footer.disclaimer`,
> `copy.rewards`).

## The look, in one paragraph

Strictly `#000` and `#fff` (`--void` / `--paper` in `app/globals.css`). Every
"shade" is white at an intensity: phosphor glow, 1-bit dithered rules and
shadows, striped title bars, raster scanlines over everything. Type is all
pixel: **VT323** for text and labels, **Silkscreen** for 8px window plates and
START, and big titles drawn from a built-in **5×7 bitmap font**
(`lib/pixelfont.ts` → `components/PixelText.tsx`) as crisp SVG paths. Motion is
one vocabulary: a CRT beam struck across the middle and the picture unfolded
out of it (intro, every window, toasts), plus stepped glitch tears on pixel
headings and a glitch-snap when the intro hands over to the page.

Adding a glyph to the pixel font: add a 7-row, 5-bit entry to `G` in
`lib/pixelfont.ts`.

## Fonts

Self-hosted in `app/fonts/` (VT323 + Silkscreen, both SIL Open Font License,
copied from `@fontsource`). No Google Fonts request.

## OG image / favicon

- `public/og.png` (1200×630) is rendered from `scripts/art/og.html`. To change
  it, edit that HTML and screenshot it at 1200×630 (any headless browser, e.g.
  Playwright: `page.setViewportSize({width:1200,height:630}); page.screenshot()`).
- `public/favicon.svg` — a single black bar on a white square.
  `public/apple-touch-icon.png` is the same at 180×180.

## Price chart (live)

FILE 06 shows the token's **real, live** price. Nothing is simulated.

- **Live price + market stats: DexScreener** (documented public API, no key,
  300 req/min) — `GET https://api.dexscreener.com/tokens/v1/solana/{CA}`, polled
  every **10s** while the tab is visible (`config.api`). Only pairs whose base
  token is our CA are used; the deepest wins. Gives price, 24H change, market
  cap, liquidity, 24H volume and buys/sells. The same feed drives the taskbar MC.
- **History: GeckoTerminal OHLCV** (DexScreener has no public history
  endpoint; pump.fun's candle endpoints are undocumented and not callable from
  other sites) — fetched for the **same pair address DexScreener reports**, so
  both describe one pool. Ranges 1H · 6H · 24H (default) · 7D · 30D · ALL;
  history refreshes every 60s.
- **Live merge:** every DexScreener tick moves the newest candle's
  close/high/low, or opens a new candle when time crosses into the next bucket.
  The price flashes when it moves; the plot marks the live point.
- **States:** "ACQUIRING SIGNAL" while loading; "NO TRADES IN {range}"; if
  history fails the live stats keep updating ("HISTORY UNAVAILABLE" + RETRY);
  if DexScreener fails the status reads "LIVE FEED PAUSED · RETRYING" and polling
  continues; both failing shows "FEED LOST" + RETRY + a DexScreener link.
- Code: `lib/dexscreener.ts` (live feed), `lib/market.ts` (history + merge),
  `components/PriceChart.tsx`.

## The walking ape

`components/ApeWalker.tsx` + `lib/apeSprite.ts`: a 1-bit pixel sprite of the
logo's monkey (round head, big ears, the eye bar, pale chest, curled tail)
walking along the bottom of the footer with its folding cane (dark grip and
band dithered, strap loop, ball tip). The cane plants, drags back, lifts and
swings forward; each plant taps out a small sonar ring. 8 frames per stride,
pixel-snapped, ×3 on desktop / ×2 on phones, paused off-screen, standing still
with reduced motion. Tune the pose in `apeFrame()`.

## Private preview link (claude.ai Artifact)

`npm run build && npm run preview:pack` writes `./.preview/`: the static export
with relative paths, inlined fonts and a small launcher page, ready to publish
as a private claude.ai Artifact (only the owner, and people they share it with,
can open it). Artifacts block calls to outside APIs, so in the preview the taskbar market
cap reads REDACTED and the chart shows its "FEED LOST" state with a link out.
The deployed site calls DexScreener and GeckoTerminal from the visitor's browser.

## Deploy to Vercel

1. Set `siteUrl` and the TODO links in `lib/config.ts`.
2. Push to GitHub → "New Project" on Vercel → import the repo.
3. Framework preset: **Next.js**. No env vars. Build: `npm run build`.
   Vercel serves the static export with compression.

Any static host works too: upload `./out`.

## Analytics

None, on purpose (footer: "no trackers. obviously."). A commented slot is in
`app/layout.tsx` for a cookie-less, self-hosted option if ever needed.

---

## Decisions the brief didn't specify

**Design (after the client's reference + direction)**
- Followed thezecathon.com's visual system (studied from its live CSS/markup):
  CRT power-on (beam → bloom → shutters → surge → raster roll), boot console
  with dotted leaders, "WELCOME TO" + pixel wordmark, windows with striped
  active bars and a solid name plate, chiselled frames, bottom taskbar with
  START, tracked-caps labels, tube-unfold window opening, glitch-snap handover.
  Our own copy and identity throughout; none of its text or brand.
- Colour: client asked for **only black and white**, so the reference's
  phosphor green became white phosphor; greys are replaced by glow, dither and
  stripes. Inverted easter egg swaps the two.
- No logo art is used anywhere (client request). The hero is the pixel
  wordmark and pixel ticker. The "click the bar 7×" egg moved to the ticker's
  bars.
- The blank-paper concept is gone: lore line removed, the "write on the sheet"
  interaction removed.
- Background "Matrix" rain: 1-bit, drawn from the same 5×7 glyphs (0, 1, █, $
  …), very faint, starts after idle, paused off-screen, static with reduced
  motion.
- Status bar became the reference's **bottom taskbar**: START menu (all files,
  replay intro, sight, sound), task buttons that track the section in view,
  node status, holders, MC, toggles, UTC clock.
- Sections are numbered as files: 00 home · 01 archive · 02 privacy season ·
  03 rewards · 04 redactor · 05 how to buy · 06 chart. (The LIGHTS OUT game was
  removed at the client's request.)
- Holder rewards placed right after Privacy Season (the meta → what holding
  pays) and linked from the hero stats row ("ZEC·XMR·NEAR / HOLDER REWARDS").
  Copy is the client's sentence verbatim; no rates, schedules or mechanics were
  invented.
- The chart is drawn by the site itself (no embed), so it stays strictly on the
  two-colour tube: white line, dithered area, dotted grid.

**Behaviour**
- `HOLDERS` always reads REDACTED: DexScreener's public API has no holder
  count. Market cap is live (deepest pool), refreshed every 60s, REDACTED on
  any failure.
- Redactor: upload only (drag-drop or picker). Mono on by default; stamp on by
  default; grain off. Bar: drag, corner/side handles, rotate handle (snaps
  level within 2.5°, Shift = 15° steps), sliders + keyboard for everything.
- Intro skip collapses the picture to a line (the reference's "put back")
  rather than fading.
- Reduced motion: no intro, no vision, no rain motion, no grain/flicker, typing
  shows the final redacted state; replay shows a toast instead.

**Performance**
- GSAP + ScrollTrigger and Lenis load after the page is idle (decoration only),
  so first-load JS is ~129 KB gzipped. Pixel headings are one SVG path per word.
- Lighthouse (mobile, gzip-served static export): Performance 96 ·
  Accessibility 100 · Best Practices 96 · SEO 100 (the BP miss was the
  DexScreener API being unreachable from the test sandbox).
