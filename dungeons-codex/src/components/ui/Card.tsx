import { Slot } from '@radix-ui/react-slot';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type CardProps = ComponentProps<'div'> & {
  /** Adds the −4px hover lift and marks the card as a pointer target. Wrap links with `asChild`. */
  interactive?: boolean;
  /** Render the single child (a link, an <article>…) with the card styling. */
  asChild?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'card' | 'panel';
};

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-7', // 20 px on phones, 28 px from sm up
  lg: 'p-6 sm:p-9',
} as const;

export function Card({
  interactive,
  asChild,
  padding = 'md',
  radius = 'card',
  className,
  ...rest
}: CardProps) {
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp
      {...rest}
      className={cn(
        'block border-[1.5px] border-line bg-surface-1 shadow-card',
        radius === 'card' ? 'rounded-card' : 'rounded-panel',
        PADDING[padding],
        interactive &&
          'group cursor-pointer transition-transform duration-200 hover:-translate-y-1 focus-visible:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        className,
      )}
    />
  );
}
