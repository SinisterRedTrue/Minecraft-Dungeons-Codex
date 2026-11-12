'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/filters/SearchInput';
import { Checkbox } from '@/components/ui/Checkbox';
import type { MultiDef, Option } from '@/lib/filters/types';

/** Lists longer than this get a search box (Prompt 07 task 4). */
const SEARCHABLE_FROM = 8;

export type MultiFilterProps = {
  def: MultiDef;
  options: readonly Option[];
  counts?: Readonly<Record<string, number>>;
  selected: readonly string[];
  /** The next selection, or `null` when it becomes empty. */
  onChange: (tokens: readonly string[] | null) => void;
};

/** Checkbox list with facet counts; options that would give no results stay visible but muted. */
export function MultiFilter({ def, options, counts, selected, onChange }: MultiFilterProps) {
  const [query, setQuery] = useState('');
  const searchable = options.length > SEARCHABLE_FROM;
  const needle = query.trim().toLowerCase();
  const shown = needle ? options.filter((o) => o.label.toLowerCase().includes(needle)) : options;

  const toggle = (token: string, on: boolean) => {
    const next = on ? [...selected, token] : selected.filter((t) => t !== token);
    onChange(next.length > 0 ? next : null);
  };

  return (
    <div className="flex flex-col gap-2">
      {searchable && (
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${def.label.toLowerCase()}`}
        />
      )}
      <ul
        aria-label={def.label}
        className={searchable ? 'max-h-64 overflow-y-auto pr-1' : undefined}
      >
        {shown.map((option) => {
          const checked = selected.includes(option.value);
          const count = counts ? (counts[option.value] ?? 0) : undefined;
          return (
            <li key={option.value}>
              <Checkbox
                checked={checked}
                disabled={count === 0 && !checked}
                onCheckedChange={(on) => toggle(option.value, on)}
                label={option.label}
                hint={count}
              />
            </li>
          );
        })}
        {shown.length === 0 && <li className="py-2 text-sm text-muted">No matches</li>}
      </ul>
      {def.match === 'all' && selected.length > 1 && (
        <p className="text-xs text-muted">Items must have all {selected.length} of these.</p>
      )}
    </div>
  );
}
