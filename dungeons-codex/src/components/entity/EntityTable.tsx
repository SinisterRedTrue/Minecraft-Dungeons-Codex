'use client';

import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import Link from 'next/link';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { formatField } from '@/components/entity/format';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { ColumnSpec, FieldFormat } from '@/config/categories';
import type { LabelMap } from '@/lib/filters/options';
import type { SortDef } from '@/lib/filters/types';
import type { EntityListItem } from '@/lib/schemas';
import { cn } from '@/lib/utils/cn';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];
const SHOW_FROM = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

/** Numbers read best biggest first; names, labels and dates start at the beginning. */
export function firstDirection(format: FieldFormat | undefined): 'asc' | 'desc' {
  return format === 'decimal' || format === 'int' || format === 'percent' || format === 'seconds'
    ? 'desc'
    : 'asc';
}

/**
 * The sort option a click on a header selects: the column's first direction, then the other one.
 * Falls back to the only direction a column has; `undefined` when it cannot sort at all.
 */
export function nextSort(
  sort: SortDef,
  prefix: string,
  current: string,
  first: 'asc' | 'desc' = 'asc',
): string | undefined {
  const has = (value: string) => sort.options.some((o) => o.value === value);
  const second = first === 'asc' ? 'desc' : 'asc';
  const a = `${prefix}-${first}`;
  const b = `${prefix}-${second}`;
  if (has(a) && has(b)) return current === a ? b : a;
  return has(a) ? a : has(b) ? b : undefined;
}

function ariaSort(
  sort: SortDef,
  prefix: string | undefined,
  current: string,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!prefix) return undefined;
  if (current === `${prefix}-asc`) return 'ascending';
  if (current === `${prefix}-desc`) return 'descending';
  return sort.options.some((o) => o.value.startsWith(`${prefix}-`)) ? 'none' : undefined;
}

export type EntityTableProps = {
  items: readonly EntityListItem[];
  columns: readonly ColumnSpec[];
  sort: SortDef;
  /** Current sort value; clicks on a sortable header call `onSortChange`. */
  sortValue: string;
  onSortChange: (value: string) => void;
  labels?: LabelMap;
  caption: string;
};

/** Sortable results table; headers share the sort state with the toolbar's SortMenu. */
export function EntityTable({
  items,
  columns,
  sort,
  sortValue,
  onSortChange,
  labels,
  caption,
}: EntityTableProps) {
  const nameSort = nextSort(sort, 'name', sortValue);
  return (
    <div className="rounded-card border-[1.5px] border-line">
      <table className="w-full border-separate border-spacing-0 text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <Header
              label="Name"
              state={ariaSort(sort, 'name', sortValue)}
              onClick={nameSort ? () => onSortChange(nameSort) : undefined}
              className="rounded-tl-card"
            />
            {columns.map((column) => {
              const target = column.sort
                ? nextSort(sort, column.sort, sortValue, firstDirection(column.format))
                : undefined;
              return (
                <Header
                  key={column.key}
                  label={column.label}
                  state={ariaSort(sort, column.sort, sortValue)}
                  onClick={target ? () => onSortChange(target) : undefined}
                  className={column.showFrom ? SHOW_FROM[column.showFrom] : undefined}
                />
              );
            })}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="group/row odd:bg-bg-2 hover:bg-accent/10">
              <th scope="row" className="min-w-0 border-t border-line px-3 py-2 font-semibold">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <RarityFrame
                    size={48}
                    rarity={RARITIES.find((r) => r === item.rarity)}
                    src={item.image?.src}
                    alt=""
                    className="size-8 shrink-0"
                  />
                  <Link
                    href={`/${item.game}/${item.category}/${item.slug}`}
                    className="min-w-0 flex-1 [overflow-wrap:anywhere] text-text underline-offset-4 hover:text-accent-text hover:underline"
                  >
                    {item.name}
                  </Link>
                  <QualityBadge quality={item.quality} />
                </div>
              </th>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'border-t border-line px-3 py-2 text-text tabular-nums',
                    column.showFrom && SHOW_FROM[column.showFrom],
                  )}
                >
                  {formatField(item, column.field, column.format, labels) ?? (
                    <span aria-label="no data" className="text-muted">
                      –
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Header({
  label,
  state,
  onClick,
  className,
}: {
  label: string;
  state: 'ascending' | 'descending' | 'none' | undefined;
  onClick?: () => void;
  className?: string;
}) {
  const Icon =
    state === 'ascending' ? ArrowUp : state === 'descending' ? ArrowDown : ChevronsUpDown;
  return (
    <th
      scope="col"
      aria-sort={state}
      className={cn(
        'sticky top-14 z-10 border-b border-line-strong bg-surface-2 px-3 py-2 font-pixel text-micro tracking-pixel text-muted uppercase last:rounded-tr-card',
        className,
      )}
    >
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="inline-flex min-h-9 cursor-pointer items-center gap-1 uppercase hover:text-text pointer-coarse:min-h-11"
        >
          {label}
          <Icon size={14} aria-hidden="true" className={state === 'none' ? 'opacity-50' : ''} />
        </button>
      ) : (
        label
      )}
    </th>
  );
}
