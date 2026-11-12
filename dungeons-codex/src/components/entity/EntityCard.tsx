import Link from 'next/link';
import type { ReactNode } from 'react';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { Card } from '@/components/ui/Card';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { EntityListItem } from '@/lib/schemas';
import { cn } from '@/lib/utils/cn';
import type { CardModel } from './format';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

export type EntityCardProps = {
  item: EntityListItem;
  model: CardModel;
  /**
   * Corner slot for ★ Favorite and ⇄ Compare (Prompt 11). It is always laid out, empty or not,
   * so adding the buttons later cannot move anything.
   */
  actions?: ReactNode;
  className?: string;
};

/**
 * Grid card (Design System §7). The name is the one link and stretches over the whole card
 * (`stretched-link`), so the corner buttons are real siblings, not nested in an anchor.
 */
export function EntityCard({ item, model, actions, className }: EntityCardProps) {
  const rarity = RARITIES.find((r) => r === item.rarity);
  return (
    <Card
      asChild
      interactive
      padding="sm"
      className={cn('relative flex h-full flex-col items-center gap-2 text-center', className)}
    >
      <article>
        <div
          data-slot="actions"
          className="absolute top-2 right-2 z-10 flex min-h-9 min-w-9 items-start justify-end gap-1"
        >
          {actions}
        </div>
        <RarityFrame size={72} rarity={rarity} src={item.image?.src} alt="" className="mt-1" />
        <h3 className="line-clamp-2 min-h-[2.75em] text-base leading-snug font-bold text-text">
          <Link href={`/${item.game}/${item.category}/${item.slug}`} className="stretched-link">
            {item.name}
          </Link>
        </h3>
        {model.meta && <p className="line-clamp-1 text-xs text-muted">{model.meta}</p>}
        {model.stats.length > 0 && (
          <dl className="mt-auto flex flex-wrap justify-center gap-x-3 gap-y-1 font-pixel text-micro tracking-pixel text-text uppercase">
            {model.stats.map((stat) => (
              <div key={stat.label} className="flex items-baseline gap-1">
                <dt className="text-muted">{stat.label}</dt>
                <dd className="max-w-28 truncate">{stat.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <QualityBadge quality={item.quality} />
      </article>
    </Card>
  );
}
