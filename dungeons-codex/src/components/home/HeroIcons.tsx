import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { ShowcaseItem } from '@/lib/showcase';
import { cn } from '@/lib/utils/cn';

/** Where each floating icon sits (percent of the hero) and how big it is; `phone` keeps it on narrow screens. */
const SLOTS = [
  { x: 4, y: 14, size: 72, delay: 0, phone: true },
  { x: 15, y: 58, size: 56, delay: 1.1, phone: false },
  { x: 8, y: 36, size: 88, delay: 2.3, phone: false },
  { x: 22, y: 12, size: 48, delay: 3.1, phone: false },
  { x: 3, y: 72, size: 64, delay: 0.7, phone: true },
  { x: 31, y: 78, size: 48, delay: 4.2, phone: false },
  { x: 90, y: 16, size: 72, delay: 1.7, phone: true },
  { x: 80, y: 60, size: 56, delay: 2.9, phone: false },
  { x: 86, y: 38, size: 88, delay: 0.4, phone: false },
  { x: 72, y: 10, size: 48, delay: 3.6, phone: false },
  { x: 91, y: 74, size: 64, delay: 4.8, phone: true },
  { x: 66, y: 80, size: 48, delay: 1.4, phone: false },
  { x: 40, y: 6, size: 48, delay: 5.2, phone: false },
  { x: 57, y: 86, size: 56, delay: 2.1, phone: false },
] as const;

/**
 * Decorative item icons drifting around the hero (Plans §05). The icons are real entities,
 * mostly uniques, chosen deterministically; the layer is `aria-hidden` and ignores pointers.
 */
export function HeroIcons({ items }: { items: readonly ShowcaseItem[] }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.slice(0, SLOTS.length).map((item, index) => {
        const slot = SLOTS[index];
        if (!slot) return null;
        return (
          <span
            key={item.id}
            className={cn('absolute', !slot.phone && 'max-sm:hidden')}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span
              className="hero-float block"
              style={{ '--float-delay': `${slot.delay}s` } as CSSProperties}
            >
              <Image
                src={item.image.src}
                alt=""
                width={slot.size}
                height={slot.size}
                unoptimized
                className="max-w-none opacity-90 [filter:drop-shadow(0_0_16px_var(--torch))] [image-rendering:pixelated] max-sm:size-14"
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
