import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export type BadgeVariant =
  | 'common'
  | 'rare'
  | 'special'
  | 'unique'
  | 'dlc'
  | 'seasonal'
  | 'soul'
  | 'approximate'
  | 'partial'
  | 'unobtainable';

// Text colours are the AA-checked tokens (scripts/contrast.ts); the tint is 12% of the same colour.
const VARIANT: Record<BadgeVariant, string> = {
  common: 'border-rarity-common/40 bg-rarity-common/12 text-rarity-common',
  rare: 'border-rarity-rare/40 bg-rarity-rare/12 text-rarity-rare',
  special: 'border-rarity-special/40 bg-rarity-special/12 text-rarity-special',
  unique: 'border-rarity-unique/40 bg-rarity-unique/12 text-rarity-unique',
  dlc: 'border-accent-text/40 bg-accent/12 text-accent-text',
  seasonal: 'border-rarity-special/40 bg-rarity-special/12 text-rarity-special',
  soul: 'border-soul-text/40 bg-soul/12 text-soul-text shadow-[0_0_10px_-3px_var(--soul)]',
  approximate: 'border-rarity-unique border-dashed bg-transparent text-rarity-unique',
  partial: 'border-line-strong bg-surface-2 text-muted',
  unobtainable: 'border-redstone-text/40 bg-redstone/12 text-redstone-text',
};

export type BadgeProps = ComponentProps<'span'> & { variant?: BadgeVariant };

export function Badge({ variant = 'common', className, ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-xs border px-2 py-0.5 font-pixel text-micro leading-4 tracking-pixel whitespace-nowrap uppercase',
        VARIANT[variant],
        className,
      )}
    />
  );
}
