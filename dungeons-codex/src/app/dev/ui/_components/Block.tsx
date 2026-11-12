import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Titled group of demo items on the /dev/ui page. */
export function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-4">
      <h2 className="font-pixel text-micro tracking-pixel text-accent-text uppercase">{title}</h2>
      <div className={cn('flex flex-wrap items-start gap-4', className)}>{children}</div>
    </section>
  );
}
