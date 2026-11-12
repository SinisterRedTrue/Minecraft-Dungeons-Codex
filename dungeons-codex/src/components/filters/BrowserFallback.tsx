import { EntityGrid, type GridConfig } from '@/components/entity/EntityGrid';
import { Skeleton } from '@/components/ui/Skeleton';
import { sortItems } from '@/lib/filters/engine';
import type { SortDef } from '@/lib/filters/types';
import type { EntityListItem } from '@/lib/schemas';
import { formatNumber } from '@/lib/utils/format';

/**
 * What the static HTML contains until the browser hydrates: the whole unfiltered list as plain,
 * crawlable cards in the default order, in the same two-column layout so nothing jumps. (The
 * interactive browser reads the URL, which needs a Suspense boundary on a static page.)
 */
export function BrowserFallback({
  items,
  sort,
  grid,
  label,
  withSidebar,
}: {
  items: readonly EntityListItem[];
  sort: SortDef;
  grid: GridConfig;
  label: string;
  withSidebar: boolean;
}) {
  return (
    <div
      className={withSidebar ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8' : undefined}
    >
      {withSidebar && <Skeleton aria-hidden="true" className="hidden h-96 rounded-card lg:block" />}
      <section aria-label="Results" className="flex min-w-0 flex-col gap-4">
        <p className="font-semibold text-text">{formatNumber(items.length)} results</p>
        <h2 className="sr-only">Results</h2>
        <EntityGrid items={sortItems(items, sort, sort.default)} config={grid} label={label} />
      </section>
    </div>
  );
}
