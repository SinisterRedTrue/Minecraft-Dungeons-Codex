'use client';

import { useMemo } from 'react';
import type { GridConfig } from '@/components/entity/EntityGrid';
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips';
import { BrowserResults, type ResultsGroupBy } from '@/components/filters/BrowserResults';
import { CompareTray } from '@/components/features/compare/CompareTray';
import { BrowserTypeRows } from '@/components/filters/BrowserTypeRows';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { FiltersSheet } from '@/components/filters/FiltersSheet';
import { ResultsCount } from '@/components/filters/ResultsCount';
import { SortMenu } from '@/components/filters/SortMenu';
import { useBrowserState } from '@/components/filters/useBrowserState';
import { ViewToggle } from '@/components/filters/ViewToggle';
import { Button3D } from '@/components/ui/Button3D';
import type { ColumnSpec } from '@/config/categories';
import type { GameId } from '@/config/games';
import { applyFilters, countActive, facetCounts, sortItems } from '@/lib/filters/engine';
import { resolveOptions, type LabelMap } from '@/lib/filters/options';
import { clearPatch, describeActive } from '@/lib/filters/state';
import type { FilterDef, Option, OptionDef, SortDef } from '@/lib/filters/types';
import type { EntityListItem } from '@/lib/schemas';

export interface CategoryBrowserProps {
  label: string;
  items: EntityListItem[];
  /** Empty for small lists that have no filters (D1 DLCs). */
  defs: FilterDef[];
  sort: SortDef;
  grid: GridConfig;
  columns: ColumnSpec[];
  groupBy?: ResultsGroupBy & { param: string; label: string };
  labels: LabelMap;
  /** Which comparison the ⇄ tray at the bottom belongs to; omitted, no tray is shown. */
  compare?: { game: GameId; category: string };
}

/**
 * The interactive Category Browser: type rows, filter panel (sidebar on desktop, sheet on
 * phones), toolbar and results, all driven by URL state (`useBrowserState`).
 */
export function CategoryBrowser({
  label,
  items,
  defs,
  sort,
  grid,
  columns,
  groupBy,
  labels,
  compare,
}: CategoryBrowserProps) {
  const { state, sortValue, view, grouped, update, setSort, setView, setGrouped } = useBrowserState(
    items,
    defs,
    sort,
    groupBy?.param,
  );

  const options = useMemo(() => {
    const out: Record<string, Option[]> = {};
    for (const def of defs) {
      if (def.kind === 'type' || def.kind === 'multi')
        out[def.key] = resolveOptions(def, items, labels);
    }
    return out;
  }, [defs, items, labels]);

  const optionLabel = (def: OptionDef, token: string) =>
    options[def.key]?.find((o) => o.value === token)?.label ?? token;

  const results = useMemo(
    () => sortItems(applyFilters(items, defs, state), sort, sortValue),
    [items, defs, state, sort, sortValue],
  );
  const counts = useMemo(() => facetCounts(items, defs, state), [items, defs, state]);
  const active = countActive(items, defs, state);
  const chips = describeActive(items, defs, state, optionLabel);
  const clearAll = () => update(clearPatch(defs), 'push');
  const filterable = defs.length > 0;
  const panel = (
    <FilterPanel
      items={items}
      defs={defs}
      state={state}
      counts={counts}
      options={options}
      onChange={update}
    />
  );
  const lastChip = chips.at(-1);

  return (
    <div className="flex flex-col gap-6">
      {filterable && (
        <BrowserTypeRows
          defs={defs}
          state={state}
          counts={counts}
          options={options}
          onChange={update}
        />
      )}
      <div
        className={filterable ? 'lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8' : undefined}
      >
        {filterable && (
          <aside
            aria-label="Filters"
            className="hidden self-start lg:sticky lg:top-24 lg:block lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-2"
          >
            {panel}
          </aside>
        )}
        <section aria-label="Results" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ResultsCount count={results.length} total={items.length} />
              {filterable && (
                <div className="lg:hidden">
                  <FiltersSheet
                    activeCount={active}
                    resultCount={results.length}
                    onClear={clearAll}
                  >
                    {panel}
                  </FiltersSheet>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <SortMenu sort={sort} value={sortValue} onChange={setSort} />
              <ViewToggle
                value={view}
                onChange={setView}
                group={
                  groupBy ? { label: groupBy.label, on: grouped, onChange: setGrouped } : undefined
                }
              />
            </div>
          </div>
          <ActiveFilterChips
            chips={chips}
            anyActive={active > 0}
            onRemove={(patch) => update(patch, 'push')}
            onClearAll={clearAll}
          />
          <h2 className="sr-only">Results</h2>
          <BrowserResults
            items={results}
            view={view}
            grouped={grouped}
            groupBy={groupBy}
            grid={grid}
            columns={columns}
            sort={sort}
            sortValue={sortValue}
            onSortChange={setSort}
            labels={labels}
            label={label}
            emptyAction={
              <div className="flex flex-wrap justify-center gap-3">
                {lastChip && (
                  <Button3D variant="stone" onClick={() => update(lastChip.patch, 'push')}>
                    Remove “{lastChip.label}”
                  </Button3D>
                )}
                <Button3D onClick={clearAll}>Clear all filters</Button3D>
              </div>
            }
          />
        </section>
      </div>
      {compare && <CompareTray game={compare.game} category={compare.category} items={items} />}
    </div>
  );
}
