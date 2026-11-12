'use client';

import { ChevronDown } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { MultiFilter } from '@/components/filters/MultiFilter';
import { RangeFilter } from '@/components/filters/RangeFilter';
import { SearchInput } from '@/components/filters/SearchInput';
import { ToggleFilter } from '@/components/filters/ToggleFilter';
import {
  countMissing,
  isNarrowed,
  isShown,
  rangeBounds,
  stateList,
  stateRange,
  stateString,
} from '@/lib/filters/engine';
import { hasData, type StatePatch } from '@/lib/filters/state';
import type {
  FacetCounts,
  FilterDef,
  FilterState,
  Item,
  MultiDef,
  Option,
  RangeDef,
} from '@/lib/filters/types';

type PanelChange = (patch: StatePatch, history: 'push' | 'replace') => void;

export type FilterPanelProps = {
  items: readonly Item[];
  defs: readonly FilterDef[];
  state: FilterState;
  counts: FacetCounts;
  /** Resolved options for every type/multi def, by key. */
  options: Readonly<Record<string, readonly Option[]>>;
  onChange: PanelChange;
};

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group/filter border-t border-line pt-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-pixel text-micro tracking-pixel text-muted uppercase [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="transition-transform group-open/filter:rotate-180"
        />
      </summary>
      <div className="pt-1 pb-3">{children}</div>
    </details>
  );
}

/**
 * Everything except the type rows: the in-results search and one group per range, multi and
 * toggle filter that is currently shown and has data. Used in the desktop sidebar and the
 * mobile sheet alike.
 */
export function FilterPanel({ items, defs, state, counts, options, onChange }: FilterPanelProps) {
  const available = useMemo(
    () =>
      new Set(defs.filter((d) => d.kind !== 'range' && hasData(items, d, {})).map((d) => d.key)),
    [items, defs],
  );
  const text = defs.find((d) => d.kind === 'text');

  const rangeBlock = (def: RangeDef) => {
    const bounds = rangeBounds(items, def, state);
    if (!bounds || bounds.min >= bounds.max) return null;
    const value = stateRange(state[def.param]);
    const missing = value && isNarrowed(value, bounds) ? countMissing(items, defs, state, def) : 0;
    return (
      <Group key={def.key} title={def.label}>
        <RangeFilter
          def={def}
          bounds={bounds}
          value={value}
          missing={missing}
          onChange={(next) => onChange({ [def.param]: next }, 'replace')}
        />
      </Group>
    );
  };

  const multiBlock = (def: MultiDef) => (
    <Group key={def.key} title={def.label}>
      <MultiFilter
        def={def}
        options={options[def.key] ?? []}
        counts={counts[def.key]}
        selected={stateList(state[def.param])}
        onChange={(tokens) => onChange({ [def.param]: tokens }, 'push')}
      />
    </Group>
  );

  const toggles = defs.flatMap((def) =>
    def.kind === 'toggle' && isShown(def, state) && available.has(def.key) ? [def] : [],
  );

  return (
    <div className="flex flex-col gap-3">
      {text && (
        <SearchInput
          value={stateString(state[text.param]) ?? ''}
          onChange={(q) => onChange({ [text.param]: q === '' ? null : q }, 'replace')}
          label="Search in results"
        />
      )}
      {defs.map((def) => {
        if (!isShown(def, state)) return null;
        if (def.kind === 'range') return rangeBlock(def);
        if (def.kind === 'multi' && available.has(def.key)) return multiBlock(def);
        return null;
      })}
      {toggles.length > 0 && (
        <fieldset className="border-t border-line pt-3">
          <legend className="sr-only">Options</legend>
          {toggles.map((def) => (
            <ToggleFilter
              key={def.key}
              def={def}
              checked={state[def.param] === true}
              onChange={(value) => onChange({ [def.param]: value }, 'push')}
            />
          ))}
        </fieldset>
      )}
    </div>
  );
}
