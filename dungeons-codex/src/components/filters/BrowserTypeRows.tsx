'use client';

import { TypeSelector } from '@/components/filters/TypeSelector';
import { isShown, stateString } from '@/lib/filters/engine';
import { patchFor, type StatePatch } from '@/lib/filters/state';
import type { FacetCounts, FilterDef, FilterState, Option, TypeDef } from '@/lib/filters/types';

/**
 * The type-first rows: every level once its `showWhen` holds, or just one `level` (the advanced
 * panel shows level 2, since the simple bar already has level 1).
 * A level 2 row that depends on a parent lists only the options that give results, most
 * frequent first (Sword 9 · Daggers 6 …); an independent one keeps every option and mutes empty ones.
 */
export function BrowserTypeRows({
  defs,
  state,
  counts,
  options,
  onChange,
  level,
}: {
  /** Only this level (the advanced panel wants level 2); omitted, every level. */
  level?: 1 | 2;
  defs: readonly FilterDef[];
  state: FilterState;
  counts: FacetCounts;
  options: Readonly<Record<string, readonly Option[]>>;
  onChange: (patch: StatePatch, history: 'push' | 'replace') => void;
}) {
  const rows = defs.filter(
    (d): d is TypeDef =>
      d.kind === 'type' && (level === undefined || d.level === level) && isShown(d, state),
  );
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-4">
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
            eyebrow={level === undefined ? `Step ${def.level} · ${def.label}` : def.label}
            stacked={level !== undefined}
            onChange={(next) => onChange(patchFor(defs, def, next), 'push')}
          />
        );
      })}
    </div>
  );
}
