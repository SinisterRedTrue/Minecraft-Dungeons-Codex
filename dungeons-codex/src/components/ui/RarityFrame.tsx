import Image from 'next/image';
import { Box } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type Rarity = 'common' | 'rare' | 'special' | 'unique';
export type RarityFrameSize = 48 | 72 | 128 | 192;

const SIZE: Record<RarityFrameSize, string> = {
  48: 'w-12',
  72: 'w-[72px]',
  128: 'w-32',
  192: 'w-48',
};

export type RarityFrameProps = Omit<ComponentProps<'div'>, 'children'> & {
  rarity?: Rarity;
  size?: RarityFrameSize;
  /** Self-hosted item image. Without it (or `children`) a neutral placeholder is shown. */
  src?: string;
  alt?: string;
  /** Preload the image: for the one above-the-fold image that is the largest paint of a page. */
  priority?: boolean;
  children?: ReactNode;
};

/**
 * Framed item slot (Design System §3). The frame is decorative: rarity is always also spelled
 * out as text elsewhere (Badge), never by colour alone. Icons render pixel-crisp at 70 %.
 */
export function RarityFrame({
  rarity = 'common',
  size = 72,
  src,
  alt = '',
  priority,
  className,
  children,
  ...rest
}: RarityFrameProps) {
  const inner = Math.round(size * 0.7);
  return (
    <div {...rest} data-rarity={rarity} className={cn('rarity-frame', SIZE[size], className)}>
      {children ??
        (src ? (
          // Already self-hosted WebP at the right size (D-005); the optimizer would only blur pixel art.
          <Image src={src} alt={alt} width={inner} height={inner} priority={priority} unoptimized />
        ) : (
          <Box aria-hidden="true" className="text-faint" strokeWidth={1.5} />
        ))}
    </div>
  );
}
