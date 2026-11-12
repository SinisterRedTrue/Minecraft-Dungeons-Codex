import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  /** Heading level; pages own their single h1. */
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
};

const SIZE = { h1: 'text-h1', h2: 'text-h2', h3: 'text-h3' } as const;

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  as: Heading = 'h2',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <p className="font-pixel text-micro tracking-pixel text-accent-text uppercase">{eyebrow}</p>
      )}
      <Heading
        className={cn(
          'font-display font-black tracking-display text-text uppercase',
          SIZE[Heading],
        )}
      >
        {title}
      </Heading>
      {subtitle && <p className="max-w-prose text-muted">{subtitle}</p>}
    </div>
  );
}
