import Link from 'next/link';
import type { ReactNode } from 'react';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { CompareButton } from '@/components/features/compare/CompareButton';
import { FavoriteButton } from '@/components/features/favorites/FavoriteButton';
import { Card } from '@/components/ui/Card';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { GameId } from '@/config/games';
import { cn } from '@/lib/utils/cn';
import type { CardModel } from './format';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/** What a card needs of an entity: a list item, or a search-index entry turned into one. */
export interface CardItem {
  id: string;
  game: GameId;
  category: string;
  slug: string;
  name: string;
  rarity?: string | undefined;
  image?: { src: string } | undefined;
  quality?: unknown;
}

export type EntityCardProps = {
  item: CardItem;
  model: CardModel;
  /** Replaces the default corner buttons (★ Favorite, ⇄ Compare). */
  actions?: ReactNode;
  /**
   * Picker mode (the Build Planner): the name is a button that selects the item instead of a
   * link to its page, and the card has no corner buttons unless `actions` gives some.
   */
  onSelect?: (item: CardItem) => void;
  /** Picker mode: this is the item already in the slot. */
  selected?: boolean;
  className?: string;
};

/**
 * Grid card (Design System §7). The name is the one link and stretches over the whole card
 * (`stretched-link`), so the corner buttons are real siblings, not nested in an anchor.
 */
export function EntityCard({
  item,
  model,
  actions,
  onSelect,
  selected,
  className,
}: EntityCardProps) {
  const rarity = RARITIES.find((r) => r === item.rarity);
  return (
    <Card
      asChild
      interactive
      padding="sm"
      className={cn(
        'relative flex h-full flex-col items-center gap-2 text-center',
        selected && 'ring-2 ring-accent',
        className,
      )}
    >
      <article>
        {/* ⇄ top left, ★ top right; the strip ignores the pointer except on the buttons. */}
        <div
          data-slot="actions"
          className="pointer-events-none absolute inset-x-1 top-1 z-10 flex min-h-11 items-start justify-between *:pointer-events-auto"
        >
          {actions ??
            (onSelect ? null : (
              <>
                <CompareButton item={item} />
                <span className="ml-auto">
                  <FavoriteButton id={item.id} name={item.name} />
                </span>
              </>
            ))}
        </div>
        <RarityFrame size={72} rarity={rarity} src={item.image?.src} alt="" className="mt-1" />
        <h3 className="line-clamp-2 min-h-[2.75em] text-base leading-snug font-bold text-text">
          {onSelect ? (
            <button
              type="button"
              aria-pressed={selected === true}
              onClick={() => onSelect(item)}
              className="stretched-link cursor-pointer text-inherit"
            >
              {item.name}
            </button>
          ) : (
            <Link href={`/${item.game}/${item.category}/${item.slug}`} className="stretched-link">
              {item.name}
            </Link>
          )}
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
