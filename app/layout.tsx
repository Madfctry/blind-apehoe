import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { config } from '@/lib/config';
import { KEYS } from '@/lib/keys';
import { Taskbar } from '@/components/Taskbar';
import { Intro } from '@/components/Intro';
import { Vision } from '@/components/Vision';
import { Cursor } from '@/components/Cursor';
import { Atmosphere, Effects, Toast } from '@/components/Effects';

// Self-hosted pixel faces (no Google Fonts request — it's a privacy site).
const mono = localFont({
  src: './fonts/VT323.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-mono',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'Menlo', 'Consolas', 'monospace'],
});
const display = localFont({
  src: [
    { path: './fonts/Silkscreen-400.woff2', weight: '400' },
    { path: './fonts/Silkscreen-700.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-display',
  adjustFontFallback: false,
  fallback: ['ui-monospace', 'monospace'],
});

const title = 'BLIND APE HOE — $███';
const description = 'no eyes. no identity. no explanation. the ape that refuses to be seen. privacy season on solana.';

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title,
  description,
  applicationName: 'BLIND APE HOE',
  keywords: ['BLIND APE HOE', 'solana', 'meme coin', 'privacy season', 'pump.fun', 'pumpswap'],
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }], apple: '/apple-touch-icon.png' },
  openGraph: {
    type: 'website',
    url: config.siteUrl,
    title,
    description,
    siteName: 'BLIND APE HOE',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'BLIND APE HOE — $███. no eyes. no identity. no explanation.' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: ['/og.png'] },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Runs before first paint: decides whether the intro plays, so nothing flashes.
const boot = `(function(){var d=document.documentElement;d.classList.remove('no-js');try{var r=matchMedia('(prefers-reduced-motion: reduce)').matches;var s=null;try{s=localStorage.getItem('${KEYS.intro}')}catch(e){}if(${config.features.intro ? 'true' : 'false'}&&!r&&!s)d.setAttribute('data-intro','play')}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`no-js ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        {/* Analytics: none. If you must, add a privacy-friendly, cookie-less one here (e.g. self-hosted Plausible/Umami). */}
      </head>
      <body>
        <a
          href="#main"
          className="label sr-only z-[95] focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:bg-paper focus:px-3 focus:py-2 focus:text-void"
        >
          SKIP TO CONTENT
        </a>
        <Intro />
        {children}
        <Vision />
        <Atmosphere />
        <Taskbar />
        <Toast />
        <Cursor />
        <Effects />
      </body>
    </html>
  );
}
