import type { ReactNode } from 'react';
import { EntityCard } from '@/components/entity/EntityCard';
import { cardModel } from '@/components/entity/format';
import type { StatSpec } from '@/config/categories';
import type { LabelMap } from '@/lib/filters/options';
import type { EntityListItem } from '@/lib/schemas';

export interface GridConfig {
  cardStats: readonly StatSpec[];
  cardMeta: readonly string[];
  labels?: LabelMap;
}

const GRID = 'grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))] sm:gap-4';

/**
 * The card grid. A plain (server-safe) component, so the category page can render the whole
 * unfiltered list into the static HTML as the fallback of the interactive browser.
 */
export function EntityGrid({
  items,
  config,
  actions,
  label,
}: {
  items: readonly EntityListItem[];
  config: GridConfig;
  /** Corner buttons for one card (Prompt 11). */
  actions?: (item: EntityListItem) => ReactNode;
  label: string;
}) {
  return (
    <ul aria-label={label} className={GRID}>
      {items.map((item) => (
        <li key={item.id}>
          <EntityCard
            item={item}
            model={cardModel(item, config.cardStats, config.cardMeta, config.labels)}
            actions={actions?.(item)}
          />
        </li>
      ))}
    </ul>
  );
}
