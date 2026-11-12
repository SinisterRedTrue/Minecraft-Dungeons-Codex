'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type RevealProps = {
  children: ReactNode;
  as?: 'div' | 'section' | 'li' | 'article';
  /** Position in a staggered group: 40 ms per step, capped at 8 steps. */
  index?: number;
  className?: string;
};

const STAGGER_MS = 40;
const MAX_STEPS = 8;

/**
 * Fades and lifts its children in the first time they scroll into view (Design System §2/§8).
 * Adds `.in` once and stops observing. The CSS keeps content visible without JS and under
 * prefers-reduced-motion, so this never hides anything that could not be revealed again.
 */
export function Reveal({ children, as: Tag = 'div', index = 0, className }: RevealProps) {
  // A callback ref (state) works for every tag in the union; a RefObject would need to be
  // an intersection of all their element types.
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      // Very old browsers: skip the animation, never leave the content hidden.
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node]);

  const style = {
    '--reveal-delay': `${Math.min(index, MAX_STEPS) * STAGGER_MS}ms`,
  } as CSSProperties;
  return (
    <Tag ref={setNode} style={style} className={cn('reveal', shown && 'in', className)}>
      {children}
    </Tag>
  );
}
