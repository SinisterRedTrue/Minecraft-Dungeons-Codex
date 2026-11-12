import { EntityCard } from '@/components/entity/EntityCard';
import { SectionBlock } from '@/components/entity/SectionBlock';
import { RELATED_LIMIT_MOBILE } from '@/config/detail';
import type { RelatedCard } from '@/lib/detail/context';
import { cn } from '@/lib/utils/cn';

/** Related items as cards: 6 on desktop, 4 on mobile (the last ones hide below `sm`). */
export function RelatedGrid({ cards }: { cards: readonly RelatedCard[] }) {
  if (cards.length === 0) return null;
  return (
    <SectionBlock id="related" title="Related">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ item, model }, index) => (
          <li key={item.id} className={cn(index >= RELATED_LIMIT_MOBILE && 'hidden sm:block')}>
            <EntityCard item={item} model={model} />
          </li>
        ))}
      </ul>
    </SectionBlock>
  );
}
