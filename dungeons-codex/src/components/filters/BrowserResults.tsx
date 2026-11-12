'use client';

import { EntityGrid, type GridConfig } from '@/components/entity/EntityGrid';
import { EntityTable } from '@/components/entity/EntityTable';
import type { ViewMode } from '@/components/filters/ViewToggle';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ColumnSpec } from '@/config/categories';
import { groupItems } from '@/lib/filters/group';
import type { LabelMap } from '@/lib/filters/options';
import type { SortDef } from '@/lib/filters/types';
import type { EntityListItem } from '@/lib/schemas';
import type { ReactNode } from 'react';

export interface ResultsGroupBy {
  field: string;
  order: { field: string; rank: string[] };
}

/**
 * The results region: cards, cards grouped (D2 armor by set), or the sortable table, plus the
 * empty state with its way out. Corner `actions` on cards arrive with Prompt 11.
 */
export function BrowserResults({
  items,
  view,
  grouped,
  groupBy,
  grid,
  columns,
  sort,
  sortValue,
  onSortChange,
  labels,
  label,
  emptyAction,
}: {
  items: readonly EntityListItem[];
  view: ViewMode;
  grouped: boolean;
  groupBy?: ResultsGroupBy;
  grid: GridConfig;
  columns: readonly ColumnSpec[];
  sort: SortDef;
  sortValue: string;
  onSortChange: (value: string) => void;
  labels: LabelMap;
  label: string;
  emptyAction: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No items match"
        text="Nothing fits all of these filters at once."
        action={emptyAction}
      />
    );
  }
  if (view === 'table') {
    return (
      <EntityTable
        items={items}
        columns={columns}
        sort={sort}
        sortValue={sortValue}
        onSortChange={onSortChange}
        labels={labels}
        caption={label}
      />
    );
  }
  if (grouped && groupBy) {
    return (
      <div className="flex flex-col gap-8">
        {groupItems(items, groupBy.field, groupBy.order).map((group) => (
          <section key={group.key} aria-label={group.key || 'Other'}>
            <h2 className="mb-3 font-display text-h3 font-extrabold text-text uppercase">
              {group.key || 'Other'}
            </h2>
            <EntityGrid items={group.items} config={grid} label={group.key || 'Other'} />
          </section>
        ))}
      </div>
    );
  }
  return <EntityGrid items={items} config={grid} label={label} />;
}
