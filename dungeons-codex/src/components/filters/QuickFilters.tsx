'use client';

import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { SearchInput } from '@/components/filters/SearchInput';
import { TypeSelector } from '@/components/filters/TypeSelector';
import { Button3D } from '@/components/ui/Button3D';
import { Chip } from '@/components/ui/Chip';
import { isShown, stateString } from '@/lib/filters/engine';
import { patchFor, type StatePatch } from '@/lib/filters/state';
import type {
  FacetCounts,
  FilterDef,
  FilterState,
  Option,
  ToggleDef,
  TypeDef,
} from '@/lib/filters/types';
import { cn } from '@/lib/utils/cn';

/** Id of the sidebar the Advanced button controls. */
export const ADVANCED_PANEL_ID = 'advanced-filters';

export type QuickFiltersProps = {
  defs: readonly FilterDef[];
  state: FilterState;
  counts: FacetCounts;
  options: Readonly<Record<string, readonly Option[]>>;
  onChange: (patch: StatePatch, history: 'push' | 'replace') => void;
  advancedOpen: boolean;
  /** How many advanced (non-quick) filters are set. */
  advancedCount: number;
  onToggleAdvanced: () => void;
  /** The phone version of the Advanced button (a bottom sheet), shown below `lg`. */
  sheet?: ReactNode;
};

/** The few filters a visitor reaches for first: level 1 type chips and the `quick` toggles. */
export function quickDefs(defs: readonly FilterDef[]) {
  const types = defs.filter((d): d is TypeDef => d.kind === 'type' && d.level === 1);
  const toggles = defs.filter((d): d is ToggleDef => d.kind === 'toggle' && d.quick === true);
  return { types, toggles };
}

/**
 * The simple filter bar above the cards: type chips (Melee / Ranged), quick toggles (Unique
 * only), a search box and the "Advanced filters" switch. Everything else lives in the panel
 * that switch reveals.
 */
export function QuickFilters({
  defs,
  state,
  counts,
  options,
  onChange,
  advancedOpen,
  advancedCount,
  onToggleAdvanced,
  sheet,
}: QuickFiltersProps) {
  const { types, toggles } = quickDefs(defs);
  const text = defs.find((d) => d.kind === 'text');
  return (
    <div role="group" aria-label="Quick filters" className="flex flex-col gap-3">
      {types
        .filter((def) => isShown(def, state))
        .map((def) => {
          const all = options[def.key] ?? [];
          if (all.length === 0) return null;
          return (
            <TypeSelector
              key={def.key}
              def={def}
              options={all}
              counts={counts[def.key]}
              value={stateString(state[def.param])}
              eyebrow={def.label}
              onChange={(next) => onChange(patchFor(defs, def, next), 'push')}
            />
          );
        })}
      <div className="flex flex-wrap items-center gap-3">
        {toggles
          .filter((def) => isShown(def, state))
          .map((def) => (
            <Chip
              key={def.key}
              selected={state[def.param] === true}
              onClick={() =>
                onChange({ [def.param]: state[def.param] === true ? null : true }, 'push')
              }
            >
              {def.label}
            </Chip>
          ))}
        {text && (
          <div className="min-w-48 flex-1 sm:max-w-xs">
            <SearchInput
              value={stateString(state[text.param]) ?? ''}
              onChange={(q) => onChange({ [text.param]: q === '' ? null : q }, 'replace')}
              label="Search in results"
            />
          </div>
        )}
        <Button3D
          variant="stone"
          size="sm"
          aria-expanded={advancedOpen}
          aria-controls={ADVANCED_PANEL_ID}
          onClick={onToggleAdvanced}
          icon={<SlidersHorizontal size={16} aria-hidden="true" />}
          className="ml-auto hidden lg:inline-flex"
        >
          Advanced filters{advancedCount > 0 ? ` (${advancedCount})` : ''}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn('transition-transform', advancedOpen && 'rotate-180')}
          />
        </Button3D>
        {sheet && <div className="ml-auto lg:hidden">{sheet}</div>}
      </div>
    </div>
  );
}
