'use client';

import { useEffect, useRef, useState } from 'react';
import { config, truncateCA } from '@/lib/config';
import { copyText } from '@/lib/clipboard';
import { uiTick } from '@/lib/sound';

export function CopyIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 7 7" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      <path d="M2 2h5v5H2zM3 3v3h3V3z M0 0h5v1H1v4H0z" fillRule="evenodd" />
    </svg>
  );
}

type Props = {
  /** chip: truncated, framed · full: the whole CA, framed · compact: tiny COPY key */
  variant?: 'chip' | 'full' | 'compact';
  className?: string;
  label?: string;
};

export function CopyCA({ variant = 'chip', className = '', label = 'CA' }: Props) {
  const [copied, setCopied] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(t.current), []);

  const onCopy = async () => {
    const ok = await copyText(config.ca);
    uiTick(1.3);
    setCopied(ok);
    clearTimeout(t.current);
    if (ok) t.current = setTimeout(() => setCopied(false), 2000);
  };

  if (variant === 'compact') {
    return (
      <button type="button" onClick={onCopy} className={`btn btn-sm ${className}`} aria-label="Copy contract address">
        {copied ? 'COPIED' : 'COPY'}
        <span className="sr-only" aria-live="polite">
          {copied ? 'Contract address copied.' : ''}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy contract address ${config.ca}`}
      className={`group flex min-h-[46px] w-full max-w-full items-center gap-3 border border-paper bg-void px-3 text-left text-[18px] transition-colors duration-150 hover:bg-paper hover:text-void hover:[text-shadow:none] ${className}`}
    >
      <span className="label shrink-0 text-[15px]">{label}</span>
      <span className="rule-l h-5 w-px shrink-0" aria-hidden="true" />
      <span className={`min-w-0 flex-1 truncate tracking-[0.04em] ${copied ? 'phos' : ''}`} aria-live="polite">
        {copied ? <span className="label text-[15px]">{config.copy.hero.copied}</span> : variant === 'full' ? config.ca : truncateCA()}
      </span>
      <CopyIcon className="shrink-0" />
    </button>
  );
}
