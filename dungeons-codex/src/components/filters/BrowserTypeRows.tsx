'use client';

import { TypeSelector } from '@/components/filters/TypeSelector';
import { isShown, stateString } from '@/lib/filters/engine';
import { patchFor, type StatePatch } from '@/lib/filters/state';
import type { FacetCounts, FilterDef, FilterState, Option, TypeDef } from '@/lib/filters/types';

/**
 * The type-first rows above the results: level 1 always, level 2 once its `showWhen` holds.
 * A level 2 row that depends on a parent lists only the options that give results, most
 * frequent first (Sword 9 · Daggers 6 …); an independent one keeps every option and mutes empty ones.
 */
export function BrowserTypeRows({
  defs,
  state,
  counts,
  options,
  onChange,
}: {
  defs: readonly FilterDef[];
  state: FilterState;
  counts: FacetCounts;
  options: Readonly<Record<string, readonly Option[]>>;
  onChange: (patch: StatePatch, history: 'push' | 'replace') => void;
}) {
  const rows = defs.filter((d): d is TypeDef => d.kind === 'type' && isShown(d, state));
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((def) => {
        const all = options[def.key] ?? [];
        const own = counts[def.key];
        const value = stateString(state[def.param]);
        const visible = def.showWhen
          ? all
              .filter((o) => (own?.[o.value] ?? 0) > 0 || o.value === value)
              .sort((a, b) => (own?.[b.value] ?? 0) - (own?.[a.value] ?? 0))
          : all;
        if (visible.length === 0) return null;
        return (
          <TypeSelector
            key={def.key}
            def={def}
            options={visible}
            counts={own}
            value={value}
            eyebrow={`Step ${def.level} · ${def.label}`}
            onChange={(next) => onChange(patchFor(defs, def, next), 'push')}
          />
        );
      })}
    </div>
  );
}
