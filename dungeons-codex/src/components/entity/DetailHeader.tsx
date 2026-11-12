import Link from 'next/link';
import type { ReactNode } from 'react';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { Badge } from '@/components/ui/Badge';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { HeaderBadge } from '@/lib/detail/infobox';
import type { LinkValue } from '@/lib/detail/refs';
import { humanize } from '@/lib/filters/tokens';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/**
 * Header of a detail page: the 128 px framed icon, the name, rarity / status badges, type chips
 * and the action buttons (★ Favorite, ⇄ Compare, ⚒ Open in Planner).
 */
export function DetailHeader({
  name,
  rarity,
  imageSrc,
  chips,
  badges,
  quality,
  source,
  actions,
}: {
  name: string;
  rarity?: string | undefined;
  imageSrc?: string | undefined;
  chips: readonly LinkValue[];
  badges: readonly HeaderBadge[];
  quality: unknown;
  source: { title: string; url: string };
  actions?: ReactNode;
}) {
  const frameRarity = RARITIES.find((r) => r === rarity);
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
      <RarityFrame size={128} rarity={frameRarity} src={imageSrc} alt="" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-h1 leading-tight font-black tracking-display [overflow-wrap:anywhere] text-text uppercase">
          {name}
        </h1>
        <ul aria-label="Badges" className="mt-3 flex flex-wrap items-center gap-2">
          {frameRarity && (
            <li>
              <Badge variant={frameRarity}>{humanize(frameRarity)}</Badge>
            </li>
          )}
          {badges.map((badge) => (
            <li key={`${badge.variant}-${badge.label}`}>
              {badge.href ? (
                <Link href={badge.href} className="rounded-xs">
                  <Badge variant={badge.variant === 'special' ? 'special' : badge.variant}>
                    {badge.label}
                  </Badge>
                </Link>
              ) : (
                <Badge variant={badge.variant}>{badge.label}</Badge>
              )}
            </li>
          ))}
          {chips.map((chip) => (
            <li key={`chip-${chip.label}`}>
              {chip.href ? (
                <Link href={chip.href} className="rounded-xs">
                  <Badge variant="partial">{chip.label}</Badge>
                </Link>
              ) : (
                <Badge variant="partial">{chip.label}</Badge>
              )}
            </li>
          ))}
          {quality === 'partial' && (
            <li>
              <QualityBadge quality={quality} source={source} />
            </li>
          )}
        </ul>
      </div>
      <div data-slot="detail-actions" className="flex flex-wrap gap-2 sm:self-start">
        {actions}
      </div>
    </header>
  );
}
