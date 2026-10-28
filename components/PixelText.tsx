import type { ElementType } from 'react';
import { GLYPH_H, wordRects } from '@/lib/pixelfont';

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  id?: string;
  /** What screen readers hear (defaults to the text, with █ read as "redacted"). */
  label?: string;
};

/**
 * Pixel display type. Each word is its own crisp SVG sized to 1em tall, so
 * headings wrap like text and scale with font-size. The real text is exposed
 * to assistive tech; the drawing is aria-hidden.
 */
export function PixelText({ text, as: Tag = 'span', className = '', id, label }: Props) {
  const words = text.split(' ').filter(Boolean);
  return (
    <Tag id={id} className={`px-text ${className}`}>
      <span className="sr-only">{label ?? text.replace(/█+/g, 'redacted')}</span>
      <span aria-hidden="true" className="px-words">
        {words.map((w, i) => {
          const { rects, cols } = wordRects(w);
          return (
            <svg
              key={i}
              className="px-word"
              viewBox={`0 0 ${cols} ${GLYPH_H}`}
              style={{ width: `${(cols / GLYPH_H).toFixed(4)}em` }}
              shapeRendering="crispEdges"
              fill="currentColor"
            >
              <path d={rects.map((r) => `M${r.x} ${r.y}h${r.w}v1h-${r.w}z`).join('')} />
            </svg>
          );
        })}
      </span>
    </Tag>
  );
}
