/**
 * ─────────────────────────────────────────────────────────────
 *  BLIND APE HOE — SITE CONFIG
 *  Every link, string and toggle lives here. Edit this file,
 *  run `npm run build`, redeploy. Nothing else needs touching.
 * ─────────────────────────────────────────────────────────────
 */

export const CA = 'EwX2T1p2PmgTsSq2Bi6XtQYxPC5krR4P2fxPfN4Qpump';

export const config = {
  name: 'BLIND APE HOE',
  ticker: '$███',
  chain: 'SOLANA',
  ca: CA,

  // TODO: set to the production domain before deploy (used for OG tags + share links).
  siteUrl: 'https://blindapehoe.com',

  /** Official X account handle (shown next to X links). */
  xHandle: '@BlindApeHoe',

  links: {
    pumpfun: `https://pump.fun/coin/${CA}`, // TODO: confirm
    dexscreener: `https://dexscreener.com/solana/${CA}`, // TODO: confirm
    jupiter: `https://jup.ag/swap/SOL-${CA}`, // TODO: confirm
    x: 'https://x.com/BlindApeHoe',
  },

  /**
   * Live market data: DexScreener public API (documented, no key, 300 req/min).
   * Polled every 10s while the tab is visible. Feeds the price chart's live
   * price + latest candle, and the taskbar market cap. On failure: REDACTED.
   */
  api: {
    dexscreener: `https://api.dexscreener.com/tokens/v1/solana/${CA}`,
    refreshMs: 10_000,
    timeoutMs: 6_000,
  },


  /**
   * Price history: GeckoTerminal public API (OHLCV candles; DexScreener has no
   * public history endpoint). Candles are fetched for the same pair address
   * DexScreener reports, so live price and history describe one pool.
   */
  priceData: {
    base: 'https://api.geckoterminal.com/api/v2',
    network: 'solana',
    timeoutMs: 9_000,
    refreshMs: 60_000,
    defaultRange: '24H',
  },

  /** One mono line. That's all the tokenomics this ape will tolerate. */
  supplyLine: 'SUPPLY: 1,000,000,000 · TAX: 0 · LP: PUMPSWAP',

  /** Feature toggles */
  features: {
    intro: true,
    vision: true,
    lenis: true,
    easterEggs: true,
  },

  /** Vision ("going blind") radius in px, from page top to footer. */
  vision: { from: 420, to: 260, edgeVisibility: 0.35, lerp: 0.12 },

  copy: {
    /** Boot console (intro). [label, value]; dotted leaders are drawn between them. */
    boot: [
      ['NODE ███', 'LINK'],
      ['HANDSHAKE', 'OK'],
      ['SIGHT', 'FAILED'],
      ['IDENTITY', '███████'],
    ] as [string, string][],
    welcome: { to: 'WELCOME TO', sub: 'PROCEEDING ANYWAY · PRIVACY SEASON ON SOLANA', hint: 'ANY KEY' },

    status: { node: 'NODE ███', online: 'ONLINE', center: 'PRIVACY SEASON' },

    hero: {
      edition: '$███ · A PRIVACY MEME ON SOLANA',
      index: 'NODE ███ — THE ARCHIVE',
      caption: ['NO EYES.', 'NO IDENTITY.', 'NO EXPLANATION.'],
      small: ['THE APE REFUSES TO BE SEEN.', 'LET THE MEME SPEAK.'],
      side: 'SCROLL TO LOSE SIGHT',
      stats: [
        ['1B', 'SUPPLY'],
        ['0%', 'TAX'],
        ['ZEC·XMR·NEAR', 'HOLDER REWARDS'],
      ] as [string, string][],
      hint: 'OR SCROLL · NO NAMES NEEDED',
      copied: 'COPIED. NOW FORGET YOU SAW IT.',
    },

    file: {
      topline: 'THE ARCHIVE',
      eyebrow: ['FILE 01 / THE ARCHIVE', 'CLEARANCE: NONE REQUIRED'],
      title: 'SUBJECT: UNSEEN.',
      // [text, redacted word indexes]
      lines: [
        ['everyone online wants to be seen.', [4]],
        ['a face. a name. a following. a number next to it.', [1, 3, 7]],
        ['the ape gave them nothing.', [4]],
        ['a black bar where the eyes should be.', [5]],
        ["it doesn't explain itself.", [2]],
        ["that's the point.", []],
      ] as [string, number[]][],
      mantra: 'no eyes. no identity. no explanation. let the meme speak.',
    },

    privacy: {
      topline: 'PRIVACY SEASON',
      eyebrow: ['FILE 02 / THE META, DECLASSIFIED', 'SEASON: NOW'],
      title: 'PRIVACY SEASON',
      cards: [
        { n: '01', title: 'THEY WANT YOUR FACE.', caption: 'cameras, scans, verification.' },
        { n: '02', title: 'THEY WANT YOUR NAME.', caption: 'profiles, handles, receipts.' },
        { n: '03', title: 'THE APE GAVE THEM ███.', caption: 'nothing to see. nothing to sell.' },
      ],
      closing: "privacy isn't hiding. it's choosing who gets to look.",
    },

    /** Holder rewards. Keep it simple and direct. */
    rewards: {
      topline: 'REWARDS',
      eyebrow: ['FILE 03 / HOLDER REWARDS', 'PAID IN PRIVACY'],
      title: 'BUY. HOLD. EARN.',
      lead: 'Buy and hold the token to receive rewards in three privacy-focused cryptocurrencies: Zcash (ZEC), Monero (XMR), and NEAR Protocol (NEAR).',
      steps: [
        ['01', 'BUY', 'get $███. no names needed.'],
        ['02', 'HOLD', 'keep it in your wallet. stay unseen.'],
        ['03', 'EARN', 'rewards arrive in ZEC, XMR and NEAR.'],
      ] as [string, string, string][],
      coins: [
        ['ZEC', 'ZCASH'],
        ['XMR', 'MONERO'],
        ['NEAR', 'NEAR PROTOCOL'],
      ] as [string, string][],
      note: 'the ape stays unseen. so do its holders.',
    },

    redactor: {
      topline: 'REDACTOR.EXE',
      eyebrow: ['FILE 04 / JOIN THE UNSEEN', 'TOOL 01'],
      title: 'REDACT YOURSELF',
      intro: 'drop a face. put a bar on it. become nobody, in high resolution.',
      notice: 'your image never leaves your device. obviously.',
      done: 'you are now unseen. change your pfp.',
      share: 'i redacted myself. $███ no eyes. no identity.',
    },

    howToBuy: {
      topline: 'PROCEDURE.SH',
      eyebrow: ['FILE 05 / PROCEDURE', '5 STEPS · 0 NAMES'],
      title: 'HOW TO BUY',
      steps: [
        ['01', 'GET A WALLET', 'phantom or solflare. no names needed.'],
        ['02', 'LOAD SOL', 'buy sol, send it to your wallet.'],
        ['03', 'GO TO THE SWAP', 'pump.fun or jupiter.'],
        ['04', 'PASTE THE CA', CA],
        ['05', 'SWAP FOR $███', 'then close your eyes.'],
      ] as [string, string, string][],
    },

    chart: {
      topline: 'LIVE FEED',
      eyebrow: ['FILE 06 / SURVEILLANCE, REVERSED', 'THEY WATCH US. WE WATCH THIS.'],
      title: 'CHART',
      source: 'LIVE · DEXSCREENER · HISTORY · GECKOTERMINAL',
    },

    footer: {
      closing: 'you were never here.',
      // NOTE: this predates the holder-rewards section. Have it reviewed so the two don't contradict.
      disclaimer:
        '$███ is a meme coin with no intrinsic value or expectation of financial return. no team promises. no roadmap. no eyes. no explanation. not financial advice.',
      trackers: 'no trackers. obviously.',
      copyright: '© ███ · ALL RIGHTS REDACTED',
    },

    eggs: {
      invert: 'you can see. for now.',
      bars: 'bars all the way down.',
    },
  },
} as const;

export type SiteConfig = typeof config;

export const truncateCA = (ca: string = CA) => `${ca.slice(0, 6)}…${ca.slice(-5)}`;

export const shareToX = (text: string, url: string = config.siteUrl) =>
  `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
