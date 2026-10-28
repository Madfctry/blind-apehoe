import type { Config } from 'tailwindcss';

// Two colours. Nothing else exists. Both are CSS variables (RGB triplets)
// so the inverted easter egg can swap them in one place.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './game/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      void: v('void'),
      paper: v('paper'),
    },
    borderRadius: { none: '0', DEFAULT: '0', full: '9999px' },
    extend: {
      fontFamily: {
        // VT323: terminal text. Silkscreen: 8px pixel chrome.
        mono: ['var(--font-mono)', 'ui-monospace', 'Menlo', 'monospace'],
        display: ['var(--font-display)', 'ui-monospace', 'monospace'],
      },
      maxWidth: { grid: '1440px' },
      transitionTimingFunction: { expo: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
};

export default config;
