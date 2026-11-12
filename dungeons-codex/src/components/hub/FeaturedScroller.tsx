import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { RarityFrame } from '@/components/ui/RarityFrame';
import { getSection } from '@/config/sections';
import type { ShowcaseItem } from '@/lib/showcase';

/** Horizontal scroll-snap row of featured unique items. Each card is one link to the item's page. */
export function FeaturedScroller({
  items,
  label,
}: {
  items: readonly ShowcaseItem[];
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className="-mx-[var(--gutter)] flex snap-x snap-mandatory scroll-pl-[var(--gutter)] [scrollbar-color:var(--text-faint)_transparent] gap-4 overflow-x-auto px-[var(--gutter)] pt-1 pb-6"
    >
      {items.map((item) => {
        const section = getSection(item.game, item.category);
        return (
          <li key={item.id} className="w-44 shrink-0 snap-start">
            <Card interactive asChild padding="sm" className="h-full">
              <Link href={`/${item.game}/${item.category}/${item.slug}`}>
                <div className="flex justify-center">
                  <RarityFrame size={72} rarity="unique" src={item.image.src} alt="" />
                </div>
                <h3 className="mt-3 line-clamp-2 text-center text-base leading-snug font-bold text-text">
                  {item.name}
                </h3>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <Badge variant="unique">Unique</Badge>
                  <span className="text-xs text-muted">{section?.label ?? item.category}</span>
                </div>
              </Link>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
