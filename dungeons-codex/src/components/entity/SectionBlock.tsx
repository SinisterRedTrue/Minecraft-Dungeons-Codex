import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** A titled block of a detail page. The title is the section's accessible name. */
export function SectionBlock({
  id,
  title,
  children,
  className,
  level = 2,
}: {
  id: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className={cn('scroll-mt-24', className)}>
      <Heading
        id={`${id}-heading`}
        className={cn(
          'mb-3 font-display font-black tracking-display text-text uppercase',
          level === 2 ? 'text-h3' : 'text-base',
        )}
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}
