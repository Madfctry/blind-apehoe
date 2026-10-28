import { Fragment } from 'react';

/**
 * Renders text with every █ drawn as a razor-clean bar, so the brand mark looks
 * identical in every font (the webfonts are latin-subset and don't carry U+2588).
 * Screen readers get the literal text via `label` when provided.
 */
export function Blocks({ text, label }: { text: string; label?: string }) {
  const parts = text.split(/(█+)/);
  const content = parts.map((p, i) =>
    p.startsWith('█') ? (
      <span key={i} aria-hidden="true" className="whitespace-nowrap">
        {Array.from(p).map((_, j) => (
          <span key={j} className="blk" />
        ))}
      </span>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
  if (!text.includes('█')) return <>{text}</>;
  return (
    <>
      <span className="sr-only">{label ?? text.replace(/█+/g, 'redacted')}</span>
      <span aria-hidden="true">{content}</span>
    </>
  );
}

/** The ticker. $███ — the redaction bar IS the brand. */
export function Ticker({ className = '' }: { className?: string }) {
  return (
    <span className={`whitespace-nowrap ${className}`}>
      <span className="sr-only">ticker: dollar sign followed by three redaction bars</span>
      <span aria-hidden="true">
        $<span className="blk" />
        <span className="blk" />
        <span className="blk" />
      </span>
    </span>
  );
}
