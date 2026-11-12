'use client';

import { X } from 'lucide-react';
import type { ActiveChip, StatePatch } from '@/lib/filters/state';

export type ActiveFilterChipsProps = {
  chips: readonly ActiveChip[];
  /** Whether anything at all is filtered (a level 1 type has no chip but still counts). */
  anyActive: boolean;
  onRemove: (patch: StatePatch) => void;
  onClearAll: () => void;
};

/** Removable chips for every active filter, plus "Clear all". Renders nothing when nothing is active. */
export function ActiveFilterChips({
  chips,
  anyActive,
  onRemove,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (!anyActive) return null;
  return (
    <ul aria-label="Active filters" className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <li key={chip.id}>
          <button
            type="button"
            onClick={() => onRemove(chip.patch)}
            aria-label={`Remove filter: ${chip.label}`}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-chip border border-accent-text/50 bg-accent/12 py-1 pr-2 pl-3 text-sm font-semibold text-accent-text hover:bg-accent/25 pointer-coarse:min-h-11"
          >
            {chip.label}
            <X size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={onClearAll}
          className="min-h-9 cursor-pointer px-2 text-sm font-semibold text-muted underline underline-offset-4 hover:text-text pointer-coarse:min-h-11"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
