'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import type { CompareRow } from '@/config/categories';
import type { GameId } from '@/config/games';
import { bestColumns, cellLines, rowDiffers, rowHasData } from '@/lib/compare/cells';
import type { CompareCell, CompareEntry } from '@/lib/compare/types';
import { humanize } from '@/lib/filters/tokens';
import { cn } from '@/lib/utils/cn';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/** Key of the built-in rarity row (the rarity is on the entry, not in `v`). */
const RARITY_FIELD = '__rarity';
const RARITY_ROW: CompareRow = { label: 'Rarity', field: RARITY_FIELD, format: 'rarity' };

/** The rows that are shown: the category's rows (plus Rarity) that have data, and, with `diffOnly`, differ. */
export function visibleRows(
  rows: readonly CompareRow[],
  entries: readonly CompareEntry[],
  diffOnly: boolean,
): { row: CompareRow; cells: (CompareCell | undefined)[] }[] {
  const withRarity = entries.some((e) => e.r) ? [RARITY_ROW, ...rows] : rows;
  return withRarity
    .map((row) => ({
      row,
      cells: entries.map((e) => (row.field === RARITY_FIELD ? e.r : e.v[row.field])),
    }))
    .filter(({ cells }) => rowHasData(cells) && (!diffOnly || rowDiffers(cells)));
}

/**
 * The side-by-side table (Wireframes §5): sticky item headers with a remove button, a sticky
 * label column, the best value of numeric rows marked. On phones two items fit and the rest
 * scrolls sideways with snap; from `md` the table fits the page and the headers stick under the
 * site header.
 */
export function CompareTable({
  game,
  category,
  caption,
  rows,
  entries,
  diffOnly,
  onRemove,
}: {
  game: GameId;
  category: string;
  caption: string;
  rows: readonly CompareRow[];
  entries: readonly CompareEntry[];
  diffOnly: boolean;
  onRemove: (slug: string) => void;
}) {
  const shown = visibleRows(rows, entries, diffOnly);
  // `relative` on the scroller: the visually hidden texts (position: absolute) in far columns
  // must be clipped by it, otherwise they widen the whole page on phones.
  return (
    <div className="relative max-h-[calc(100dvh-9rem)] snap-x snap-mandatory scroll-pl-[6.5rem] overflow-auto rounded-card border-[1.5px] border-line md:max-h-none md:overflow-visible">
      <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm md:w-full md:table-fixed">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky top-0 left-0 z-20 w-[6.5rem] max-w-[6.5rem] min-w-[6.5rem] rounded-tl-card border-b border-line-strong bg-surface-2 p-2 md:top-14 md:w-40 md:max-w-none md:min-w-0 md:p-3"
            >
              <span className="sr-only">Attribute</span>
            </th>
            {entries.map((entry, index) => (
              <th
                key={entry.s}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 w-[calc((100vw-2*var(--gutter)-6.5rem)/2)] min-w-28 snap-start border-b border-l border-line-strong bg-surface-2 p-2 align-top md:top-14 md:w-auto md:min-w-0 md:p-3',
                  index === entries.length - 1 && 'rounded-tr-card',
                )}
              >
                <div className="flex flex-col items-center gap-2 text-center">
                  <RarityFrame
                    size={48}
                    rarity={RARITIES.find((r) => r === entry.r)}
                    src={entry.i}
                    alt=""
                  />
                  <Link
                    href={`/${game}/${category}/${entry.s}`}
                    className="inline-flex min-h-6 items-center font-bold [overflow-wrap:anywhere] text-text underline-offset-4 hover:text-accent-text hover:underline pointer-coarse:min-h-11"
                  >
                    {entry.n}
                  </Link>
                  <button
                    type="button"
                    onClick={() => onRemove(entry.s)}
                    aria-label={`Remove ${entry.n} from comparison`}
                    className="inline-flex h-11 cursor-pointer items-center gap-1 rounded-btn px-3 text-xs font-semibold text-muted hover:bg-surface-3 hover:text-text"
                  >
                    <X size={14} aria-hidden="true" />
                    Remove
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map(({ row, cells }) => {
            const best = bestColumns(row, cells);
            return (
              <tr key={row.field} data-row={row.label}>
                <th
                  scope="row"
                  className="sticky left-0 z-[5] max-w-[6.5rem] border-t border-line bg-surface-1 p-2 align-top font-pixel text-micro tracking-pixel [overflow-wrap:anywhere] text-muted uppercase md:max-w-none md:p-3"
                >
                  {row.label}
                </th>
                {cells.map((cell, index) => (
                  <Cell key={entries[index]?.s} row={row} cell={cell} best={best.has(index)} />
                ))}
              </tr>
            );
          })}
          {shown.length === 0 && (
            <tr>
              <td
                colSpan={entries.length + 1}
                className="border-t border-line p-6 text-center text-muted"
              >
                These items are the same in every row. Turn off “Differences only” to see them.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  row,
  cell,
  best,
}: {
  row: CompareRow;
  cell: CompareCell | undefined;
  best: boolean;
}) {
  const isRarity = row.field === RARITY_FIELD;
  const lines = isRarity
    ? typeof cell === 'string'
      ? [humanize(cell)]
      : undefined
    : cellLines(row, cell);
  return (
    <td
      data-best={best || undefined}
      className={cn(
        'border-t border-l border-line p-2 align-top [overflow-wrap:anywhere] text-text tabular-nums md:p-3',
        best && 'bg-accent/15 font-bold',
      )}
    >
      {!lines ? (
        <span aria-label="no data" className="text-muted">
          –
        </span>
      ) : isRarity && typeof cell === 'string' ? (
        <Badge variant={RARITIES.find((r) => r === cell) ?? 'common'}>{lines[0]}</Badge>
      ) : row.format === 'list' ? (
        <ul className="list-disc space-y-1 pl-4 marker:text-muted">
          {lines.map((line, i) => (
            <li key={`${i}-${line}`}>{line}</li>
          ))}
        </ul>
      ) : (
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
          {lines[0]}
          {best && (
            <>
              <span aria-hidden="true" className="text-accent-text">
                ◆
              </span>
              <span className="sr-only"> (best)</span>
            </>
          )}
        </span>
      )}
    </td>
  );
}
