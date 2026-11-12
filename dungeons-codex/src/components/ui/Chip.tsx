import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ChipProps = Omit<ComponentProps<'button'>, 'children'> & {
  selected?: boolean;
  /** Result count bubble, e.g. facet counts. */
  count?: number;
  icon?: ReactNode;
  children: ReactNode;
};

export function Chip({ selected = false, count, icon, className, children, ...rest }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={cn(
        'inline-flex h-9 cursor-pointer items-center gap-2 rounded-chip border px-4 text-sm font-semibold whitespace-nowrap pointer-coarse:min-h-11',
        'transition-[transform,border-color,background-color] duration-[var(--dur-press)] hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        selected
          ? 'border-accent-edge bg-accent text-accent-ink shadow-[0_3px_0_var(--accent-edge)]'
          : 'border-line bg-surface-2 text-text hover:border-accent',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
    >
      {icon}
      <span>{children}</span>
      {count !== undefined && (
        <>
          {/* A real space keeps the accessible name "Melee 82" (the flex gap hides it visually). */}{' '}
          <span
            className={cn(
              'min-w-6 rounded-chip px-1.5 text-center font-pixel text-micro leading-5',
              selected ? 'bg-accent-ink/20 text-accent-ink' : 'bg-surface-3 text-muted',
            )}
          >
            {count}
          </span>
        </>
      )}
    </button>
  );
}
