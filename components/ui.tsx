import type { ReactNode } from 'react';

/** A section on the desk: spacing, an anchor, and its window. */
export function Section({ id, labelledBy, children, wide }: { id: string; labelledBy: string; children: ReactNode; wide?: boolean }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="scroll-mt-6 py-12 lg:py-20">
      <div className={`shell ${wide ? '' : 'max-w-[1120px]'}`}>{children}</div>
    </section>
  );
}

type LinkBtnProps = {
  href: string;
  children: ReactNode;
  primary?: boolean;
  arrow?: boolean;
  className?: string;
  label?: string;
};

/** External link styled as a terminal key. Empty href → dashed "SOON" state (TODO links). */
export function LinkBtn({ href, children, primary, arrow, className = '', label }: LinkBtnProps) {
  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`${label ?? (typeof children === 'string' ? children : 'link')}, coming soon`}
        title="soon"
        className={`btn ${className}`}
      >
        {children} <span className="text-[14px]">· SOON</span>
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`btn ${primary ? 'btn-primary' : ''} ${className}`}>
      {children}
      {arrow && (
        <span className="arw" aria-hidden="true">
          →
        </span>
      )}
    </a>
  );
}
