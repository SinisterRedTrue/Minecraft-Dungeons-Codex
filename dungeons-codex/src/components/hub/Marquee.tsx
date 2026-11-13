import type { CSSProperties, ReactNode } from 'react';

/** The visible list plus this many hidden copies; with 3 copies a row stays seamless up to 3x its own width. */
const CLONES = 3;
const LIST = 'marquee-list flex shrink-0 gap-4 pt-1 pr-4 pb-6';

/**
 * A horizontal row that drifts left forever and stops while the pointer is over it (or focus is inside).
 * CSS only (`.marquee*` in ui.css), so it stays a Server Component and ships no JavaScript.
 *
 * The motion exists only for a mouse (`hover: hover`) and when the visitor has not asked for reduced
 * motion. On touch screens and under reduced motion it is the plain scroll-snap row it always was, so
 * nothing is lost for someone who cannot hover or does not want movement. The extra lists that make the
 * loop seamless are `aria-hidden` and `inert`: screen readers and the Tab key only ever see one copy.
 */
export function Marquee({
  label,
  secondsPerItem = 5,
  itemCount,
  className = '',
  children,
}: {
  /** Accessible name of the list. */
  label: string;
  /** Number of `<li>` children, used to keep the speed the same whatever the row length. */
  itemCount: number;
  /** Seconds one card takes to pass; about 40 px/s for a 192 px card. */
  secondsPerItem?: number;
  /** Extra classes for the scroll container (for example `snap-mandatory`). */
  className?: string;
  /** The `<li>` items. */
  children: ReactNode;
}) {
  const style = {
    '--marquee-duration': `${Math.max(itemCount, 1) * secondsPerItem}s`,
  } as CSSProperties;
  return (
    <div
      className={`marquee -mx-[var(--gutter)] snap-x scroll-pl-[var(--gutter)] [scrollbar-color:var(--text-faint)_transparent] overflow-x-auto px-[var(--gutter)] ${className}`}
    >
      <div className="marquee-track flex w-max" style={style}>
        <ul aria-label={label} className={LIST}>
          {children}
        </ul>
        {Array.from({ length: CLONES }, (_, i) => (
          <ul key={i} aria-hidden="true" inert className={`${LIST} marquee-clone`}>
            {children}
          </ul>
        ))}
      </div>
    </div>
  );
}
