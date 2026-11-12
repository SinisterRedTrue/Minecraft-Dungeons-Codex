import Link from 'next/link';
import type { ReactNode } from 'react';
import type { LinkValue } from '@/lib/detail/refs';
import { cn } from '@/lib/utils/cn';

const PILL =
  'inline-flex min-h-9 items-center rounded-chip border px-3 text-sm font-semibold pointer-coarse:min-h-11';

/**
 * Names that link to their entity page when they resolved, and plain pills when they are raw wiki
 * text (an unresolved reference is shown as written, never dropped or guessed at).
 */
export function RefChips({
  items,
  className,
  label,
}: {
  items: readonly LinkValue[];
  className?: string;
  /** Accessible name of the list. */
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item, index) => (
        <li key={`${index}-${item.href ?? item.label}`}>
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                PILL,
                'border-line bg-surface-2 text-text hover:-translate-y-0.5 hover:border-accent motion-reduce:hover:translate-y-0',
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(PILL, 'border-line/70 bg-surface-1 text-muted')}>{item.label}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** A small non-interactive tag ("Stackable", "Level II"). */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border border-line bg-surface-2 px-3 py-1 text-sm font-semibold text-text',
        className,
      )}
    >
      {children}
    </span>
  );
}
