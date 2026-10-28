'use client';

import { useId, useState, type ReactNode } from 'react';
import { PixelText } from './PixelText';

type Props = {
  /** Title-bar name, after "BLIND APE HOE /". */
  title: string;
  children?: ReactNode;
  /** [left, right] tracked labels above the heading. */
  eyebrow?: readonly [string, string];
  /** Pixel display heading. */
  heading?: string;
  headingId?: string;
  headingLabel?: string;
  lead?: ReactNode;
  foot?: ReactNode;
  onClose?: () => void;
  closeLabel?: string;
  minimizable?: boolean;
  reveal?: boolean;
  className?: string;
  bodyClassName?: string;
};

function Glyph({ kind }: { kind: 'min' | 'max' | 'x' }) {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" shapeRendering="crispEdges" fill="currentColor" aria-hidden="true">
      {kind === 'min' && <rect x="1" y="7" width="7" height="1" />}
      {kind === 'max' && <path d="M1 1h7v7H1zM2 2v5h5V2z" fillRule="evenodd" />}
      {kind === 'x' && <path d="M1 1h1v1h1v1h1v1h1V3h1V2h1V1h1v1H7v1H6v1H5v1h1v1h1v1h1v1H7V7H6V6H5V5H4v1H3v1H2v1H1V7h1V6h1V5h1V4H3V3H2V2H1z" />}
    </svg>
  );
}

/**
 * A window on the tube: striped active bar, the name on a solid plate,
 * a minimise that works, and a body that unfolds out of a struck line.
 */
export function Window({
  title,
  children,
  eyebrow,
  heading,
  headingId,
  headingLabel,
  lead,
  foot,
  onClose,
  closeLabel = 'Close window',
  minimizable = true,
  reveal = true,
  className = '',
  bodyClassName = '',
}: Props) {
  const [min, setMin] = useState(false);
  const id = useId();
  return (
    <div className={`win ${className}`} data-reveal={reveal ? '' : undefined}>
      <div className="w-bar">
        <span className="w-t">
          BLIND APE HOE <b>/</b> {title}
        </span>
        <span className="flex-1" />
        {minimizable && (
          <button
            type="button"
            className="w-x"
            onClick={() => setMin((m) => !m)}
            aria-expanded={!min}
            aria-controls={`${id}-b`}
            aria-label={min ? `Restore ${title}` : `Minimize ${title}`}
          >
            <Glyph kind={min ? 'max' : 'min'} />
          </button>
        )}
        {onClose && (
          <button type="button" className="w-x" onClick={onClose} aria-label={closeLabel}>
            <Glyph kind="x" />
          </button>
        )}
      </div>
      <div id={`${id}-b`} className="w-body" hidden={min}>
        {(eyebrow || heading) && (
          <header className="w-head rule-b">
            {eyebrow && (
              <div className="eyebrow label">
                <span className="phos">{eyebrow[0]}</span>
                <span>{eyebrow[1]}</span>
              </div>
            )}
            {heading && <PixelText as="h2" id={headingId} text={heading} label={headingLabel} className="t-px glitchable glitch-hover" />}
            {lead}
          </header>
        )}
        <div className={bodyClassName}>{children}</div>
        {foot && <footer className="w-foot rule-t label">{foot}</footer>}
      </div>
    </div>
  );
}
