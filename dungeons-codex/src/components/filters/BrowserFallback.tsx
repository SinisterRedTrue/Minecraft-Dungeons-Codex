import { EntityGrid, type GridConfig } from '@/components/entity/EntityGrid';
import { sortItems } from '@/lib/filters/engine';
import type { SortDef } from '@/lib/filters/types';
import type { EntityListItem } from '@/lib/schemas';
import { formatNumber } from '@/lib/utils/format';

/**
 * What the static HTML contains until the browser hydrates: the whole unfiltered list as plain,
 * crawlable cards in the default order, in the same full-width layout so nothing jumps (the advanced panel starts closed). (The
 * interactive browser reads the URL, which needs a Suspense boundary on a static page.)
 */
export function BrowserFallback({
  items,
  sort,
  grid,
  label,
}: {
  items: readonly EntityListItem[];
  sort: SortDef;
  grid: GridConfig;
  label: string;
}) {
  return (
    <div>
      <section aria-label="Results" className="flex min-w-0 flex-col gap-4">
        <p className="font-semibold text-text">{formatNumber(items.length)} results</p>
        <h2 className="sr-only">Results</h2>
        <EntityGrid items={sortItems(items, sort, sort.default)} config={grid} label={label} />
      </section>
    </div>
  );
}
