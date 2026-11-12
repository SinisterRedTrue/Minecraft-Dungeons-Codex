'use client';

import { useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const MAX_TILT_DEG = 4;

export type TiltCardProps = {
  children: ReactNode;
  className?: string;
  'data-game'?: string;
};

/**
 * Lifts −4 px on hover (CSS) and, with a mouse only, leans up to 4° toward the pointer
 * (Design System §8). Reduced motion and touch never tilt; the check runs at event time so it
 * follows live OS changes.
 */
export function TiltCard({ children, className, ...rest }: TiltCardProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number } | null>(null);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (
      e.pointerType !== 'mouse' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // −0.5 … 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -py * 2 * MAX_TILT_DEG, y: px * 2 * MAX_TILT_DEG });
  };

  const style: CSSProperties | undefined = tilt
    ? {
        transform: `perspective(900px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
      }
    : undefined;

  return (
    <div
      {...rest}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setTilt(null)}
      style={style}
      className={cn(
        'rounded-panel shadow-[0_24px_50px_-28px_var(--accent-glow)] transition-[translate,transform,box-shadow] duration-200 ease-out will-change-transform',
        'focus-within:-translate-y-1 focus-within:shadow-[0_36px_80px_-26px_var(--accent-glow)] hover:-translate-y-1 hover:shadow-[0_36px_80px_-26px_var(--accent-glow)]',
        'motion-reduce:transition-none motion-reduce:focus-within:translate-y-0 motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
