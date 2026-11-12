'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EntityGrid, type GridConfig } from '@/components/entity/EntityGrid';
import { BrowserTypeRows } from '@/components/filters/BrowserTypeRows';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { ResultsCount } from '@/components/filters/ResultsCount';
import { SortMenu } from '@/components/filters/SortMenu';
import { useLocalBrowserState } from '@/components/filters/useLocalBrowserState';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { SheetContent } from '@/components/ui/Sheet';
import { getCategoryConfig } from '@/config/categories';
import { getFilterConfig } from '@/config/filters';
import { applyFilters, countActive, facetCounts, sortItems } from '@/lib/filters/engine';
import { resolveOptions, type LabelMap } from '@/lib/filters/options';
import { clearPatch } from '@/lib/filters/state';
import type { FilterDef, Option, SortDef } from '@/lib/filters/types';
import { scopeDefs, scopeItems, type PlannerData } from '@/lib/planner/data';
import type { SlotDef } from '@/lib/planner/slots';
import type { EntityListItem } from '@/lib/schemas';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';

/**
 * The item picker (Wireframes §6): the Category Browser's type rows, filter panel, sort and
 * cards, scoped to what the slot may hold (a Helmet slot lists helmets only). Choosing a card
 * puts the item into the slot. A large Dialog on desktop, a bottom Sheet on phones.
 */
export function ItemPicker({
  slot,
  data,
  open,
  onOpenChange,
  selectedSlug,
  onSelect,
}: {
  slot: SlotDef;
  data: PlannerData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The item already in the slot. */
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}) {
  const desktop = useMediaQuery('(min-width: 1024px)');
  const title = `Choose ${slot.label}`;
  const description = 'Pick an item for this slot. Filters work like the category pages.';
  const body = (
    <PickerBody
      key={slot.key}
      slot={slot}
      data={data}
      selectedSlug={selectedSlug}
      onSelect={(slug) => {
        onSelect(slug);
        onOpenChange(false);
      }}
    />
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {desktop ? (
        <DialogContent
          title={title}
          description={description}
          className="h-[88dvh] w-[min(72rem,calc(100%-2rem))] max-w-none sm:p-6"
        >
          {body}
        </DialogContent>
      ) : (
        <SheetContent title={title} description={description} focusSheet className="h-[92dvh]">
          {body}
        </SheetContent>
      )}
    </Dialog>
  );
}

function PickerBody({
  slot,
  data,
  selectedSlug,
  onSelect,
}: {
  slot: SlotDef;
  data: PlannerData;
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
}) {
  const { game } = data;
  const items = useMemo(() => scopeItems(data.items(slot.category), slot), [data, slot]);
  const config = getCategoryConfig(game, slot.category);
  const filters = getFilterConfig(game, slot.category);
  const defs = useMemo(() => scopeDefs(filters?.defs ?? [], slot), [filters, slot]);
  const sort = filters?.sort;
  const labels = data.file.labels[slot.category] ?? {};
  const [showFilters, setShowFilters] = useState(false);

  if (!config || !sort) return null;
  return (
    <PickerResults
      slot={slot}
      items={items}
      defs={defs}
      sort={sort}
      grid={{ cardStats: config.cardStats, cardMeta: config.cardMeta, labels }}
      labels={labels}
      selectedSlug={selectedSlug}
      onSelect={onSelect}
      showFilters={showFilters}
      onToggleFilters={() => setShowFilters((on) => !on)}
    />
  );
}

type ResultsProps = {
  slot: SlotDef;
  items: EntityListItem[];
  defs: FilterDef[];
  sort: SortDef;
  grid: GridConfig;
  labels: LabelMap;
  selectedSlug: string | undefined;
  onSelect: (slug: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
};

function PickerResults({
  slot,
  items,
  defs,
  sort,
  grid,
  labels,
  selectedSlug,
  onSelect,
  showFilters,
  onToggleFilters,
}: ResultsProps) {
  const { state, sortValue, update, setSort } = useLocalBrowserState(items, defs, sort);
  const options = useMemo(() => {
    const out: Record<string, Option[]> = {};
    for (const def of defs) {
      if (def.kind === 'type' || def.kind === 'multi') {
        out[def.key] = resolveOptions(def, items, labels);
      }
    }
    return out;
  }, [defs, items, labels]);
  const results = useMemo(
    () => sortItems(applyFilters(items, defs, state), sort, sortValue),
    [items, defs, state, sort, sortValue],
  );
  const counts = useMemo(() => facetCounts(items, defs, state), [items, defs, state]);
  const active = countActive(items, defs, state);
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
  const selected = items.find((item) => item.slug === selectedSlug);

  return (
    <div className="flex flex-col gap-5" data-testid="item-picker">
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
        className={filterable ? 'lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6' : undefined}
      >
        {filterable && (
          <aside
            aria-label="Filters"
            className="hidden self-start lg:sticky lg:top-0 lg:block lg:max-h-[60dvh] lg:overflow-y-auto lg:pr-2"
          >
            {panel}
          </aside>
        )}
        <section aria-label={`${slot.label} results`} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ResultsCount count={results.length} total={items.length} />
              {filterable && (
                <div className="lg:hidden">
                  <Button3D
                    variant="stone"
                    size="sm"
                    aria-expanded={showFilters}
                    onClick={onToggleFilters}
                    icon={<SlidersHorizontal size={16} aria-hidden="true" />}
                  >
                    Filters{active > 0 ? ` (${active})` : ''}
                  </Button3D>
                </div>
              )}
            </div>
            <SortMenu sort={sort} value={sortValue} onChange={setSort} />
          </div>
          {filterable && showFilters && <div className="lg:hidden">{panel}</div>}
          {selected && (
            <p className="m-0 text-sm text-muted">
              In this slot now: <span className="font-semibold text-text">{selected.name}</span>
            </p>
          )}
          {results.length === 0 ? (
            <EmptyState
              title="No items match"
              text="Nothing fits all of these filters at once."
              action={
                <Button3D onClick={() => update(clearPatch(defs), 'push')}>
                  Clear all filters
                </Button3D>
              }
            />
          ) : (
            <EntityGrid
              items={results}
              config={grid}
              label={`${slot.label} items`}
              selectedId={selected?.id}
              onSelect={(item) => onSelect(item.slug)}
            />
          )}
        </section>
      </div>
    </div>
  );
}
