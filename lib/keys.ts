/**
 * localStorage keys. A plain module (no 'use client') so server components —
 * like the pre-paint intro script in app/layout.tsx — get the real strings.
 */
export const KEYS = {
  intro: 'bah:intro-seen',
  sight: 'bah:sight',
} as const;
