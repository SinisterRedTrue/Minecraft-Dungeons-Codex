import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/** Placeholder block. Decorative, so it is hidden from assistive tech; static under reduced motion. */
export function Skeleton({ className, ...rest }: ComponentProps<'div'>) {
  return <div aria-hidden="true" {...rest} className={cn('skeleton rounded-sm', className)} />;
}
