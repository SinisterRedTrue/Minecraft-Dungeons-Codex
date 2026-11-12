'use client';

import { Command } from 'cmdk';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { RarityFrame, type Rarity } from '@/components/ui/RarityFrame';
import { MAX_COMPARE } from '@/lib/compare/store';
import type { CompareEntry } from '@/lib/compare/types';

const RARITIES: readonly Rarity[] = ['common', 'rare', 'special', 'unique'];

/**
 * "+ Add item": a combobox scoped to the category being compared (so categories never mix). Items
 * already in the table are left out, and it is disabled once the table holds four.
 */
export function AddItemPicker({
  categoryLabel,
  entries,
  selected,
  onAdd,
}: {
  categoryLabel: string;
  entries: readonly CompareEntry[];
  selected: readonly string[];
  onAdd: (slug: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const full = selected.length >= MAX_COMPARE;
  const available = entries.filter((e) => !selected.includes(e.s));

  return (
    <Popover open={open && !full} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button3D
          variant="gold"
          disabled={full}
          icon={<Plus size={18} aria-hidden="true" />}
          aria-haspopup="listbox"
          title={full ? `Compare holds up to ${MAX_COMPARE}. Remove one first.` : undefined}
        >
          Add item
        </Button3D>
      </PopoverTrigger>
      <PopoverContent align="end" aria-label="Add item" className="w-80 p-0">
        <Command label={`Search ${categoryLabel}`} className="flex flex-col">
          <Command.Input
            placeholder={`Search ${categoryLabel.toLowerCase()}…`}
            aria-label={`Search ${categoryLabel}`}
            autoComplete="off"
            className="h-12 border-b border-line bg-transparent px-4 text-base text-text outline-none placeholder:text-faint"
          />
          <Command.List className="max-h-72 overflow-y-auto overscroll-contain p-2">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
              No {categoryLabel.toLowerCase()} match.
            </Command.Empty>
            {available.map((entry) => (
              <Command.Item
                key={entry.s}
                value={`${entry.n} ${entry.s}`}
                onSelect={() => {
                  onAdd(entry.s);
                  setOpen(false);
                }}
                className="flex min-h-12 cursor-pointer items-center gap-3 rounded-btn px-2 py-1.5 text-sm font-semibold text-text outline-none aria-selected:bg-accent/20"
              >
                <RarityFrame
                  size={48}
                  rarity={RARITIES.find((r) => r === entry.r)}
                  src={entry.i}
                  alt=""
                  className="size-9 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate">{entry.n}</span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
