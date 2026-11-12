'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { SearchInput } from '@/components/filters/SearchInput';
import { Chip } from '@/components/ui/Chip';
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { FACET_ALL } from '@/lib/filters/engine';
import type { Option, TypeDef } from '@/lib/filters/types';
import { cn } from '@/lib/utils/cn';

/**
 * More options than this turn the chip row into a searchable list. Weapon types (up to 26 under
 * one kind) stay chips so every one is a click away; armor groups (31) and sets (38) do not.
 */
const MAX_CHIPS = 30;

export type TypeSelectorProps = {
  def: TypeDef;
  options: readonly Option[];
  /** Facet counts for this def (`FACET_ALL` = results without it). */
  counts?: Readonly<Record<string, number>>;
  value: string | undefined;
  onChange: (value: string | null) => void;
  /** Small caption left of the chips, e.g. "Step 1 · Type". */
  eyebrow: string;
  allLabel?: string;
};

/**
 * The type-first selector: an "All" chip plus one chip per option, with counts. Level 2 rows use
 * the same component. Chips scroll horizontally (snapping) on phones and wrap from `sm` up;
 * Left/Right/Home/End move between chips. A long option list (D2 armor sets) becomes a popover
 * with a search box instead.
 */
export function TypeSelector(props: TypeSelectorProps) {
  const { options, eyebrow } = props;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
      <p className="shrink-0 pt-2 font-pixel text-micro tracking-pixel text-muted uppercase sm:w-28">
        {eyebrow}
      </p>
      {options.length > MAX_CHIPS ? <ChipList {...props} combo /> : <ChipList {...props} />}
    </div>
  );
}

function ChipList({
  def,
  options,
  counts,
  value,
  onChange,
  allLabel = 'All',
  combo,
}: TypeSelectorProps & { combo?: boolean }) {
  if (combo) {
    return (
      <OptionPicker
        def={def}
        options={options}
        counts={counts}
        value={value}
        onChange={onChange}
        allLabel={allLabel}
      />
    );
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    const chips = [
      ...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
    ];
    const at = chips.indexOf(document.activeElement as HTMLButtonElement);
    if (at === -1) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? chips.length - 1
          : (at + (event.key === 'ArrowRight' ? 1 : -1) + chips.length) % chips.length;
    chips[next]?.focus();
  };

  return (
    <div
      role="group"
      aria-label={def.label}
      onKeyDown={onKeyDown}
      className="chip-row -mx-[var(--gutter)] flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto px-[var(--gutter)] py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
    >
      <Chip
        selected={value === undefined}
        count={counts?.[FACET_ALL]}
        onClick={() => onChange(null)}
        className="snap-start"
      >
        {allLabel}
      </Chip>
      {options.map((option) => {
        const count = counts?.[option.value] ?? 0;
        const selected = value === option.value;
        return (
          <Chip
            key={option.value}
            selected={selected}
            count={counts ? count : undefined}
            disabled={counts !== undefined && count === 0 && !selected}
            onClick={() => onChange(selected ? null : option.value)}
            className="snap-start"
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

function OptionPicker({
  def,
  options,
  counts,
  value,
  onChange,
  allLabel,
}: Omit<TypeSelectorProps, 'eyebrow'> & { allLabel: string }) {
  const [query, setQuery] = useState('');
  const selected = options.find((o) => o.value === value);
  const shown = options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()));
  const row = (
    token: string | null,
    label: string,
    count: number | undefined,
    isSelected: boolean,
  ) => (
    <li key={token ?? 'all'}>
      <PopoverClose asChild>
        <button
          type="button"
          aria-pressed={isSelected}
          disabled={count === 0 && !isSelected}
          onClick={() => onChange(token)}
          className={cn(
            'flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-sm px-3 text-left text-sm font-medium hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50',
            isSelected && 'bg-accent/15 font-bold',
          )}
        >
          <span className="grid size-4 place-items-center" aria-hidden="true">
            {isSelected && <Check size={14} />}
          </span>
          <span className="flex-1">{label}</span>
          {count !== undefined && <span className="text-xs text-muted">{count}</span>}
        </button>
      </PopoverClose>
    </li>
  );

  return (
    <Popover onOpenChange={(open) => open || setQuery('')}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${def.label}: ${selected?.label ?? allLabel}`}
          className={cn(
            'inline-flex h-11 cursor-pointer items-center gap-2 rounded-chip border px-4 text-sm font-semibold sm:h-9 pointer-coarse:h-11',
            selected
              ? 'border-accent-edge bg-accent text-accent-ink shadow-[0_3px_0_var(--accent-edge)]'
              : 'border-line bg-surface-2 text-text hover:border-accent',
          )}
        >
          <span>
            {def.label}: {selected?.label ?? allLabel}
          </span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <SearchInput
          value={query}
          onChange={setQuery}
          label={`Search ${def.label.toLowerCase()}`}
        />
        <ul className="mt-3 max-h-72 overflow-y-auto">
          {query === '' && row(null, allLabel, counts?.[FACET_ALL], value === undefined)}
          {shown.map((o) => row(o.value, o.label, counts?.[o.value] ?? 0, o.value === value))}
          {shown.length === 0 && <li className="px-3 py-2 text-sm text-muted">No matches</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
