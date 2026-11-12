'use client';

import { Command } from 'cmdk';
import { ChevronDown, Plus } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import { cn } from '@/lib/utils/cn';

function Icon({ src }: { src: string | undefined }) {
  return src ? (
    <Image
      src={src}
      alt=""
      width={28}
      height={28}
      unoptimized
      className="size-7 shrink-0 [image-rendering:pixelated]"
    />
  ) : (
    <span aria-hidden="true" className="size-7 shrink-0 rounded-xs bg-surface-3" />
  );
}

const HINT: Record<ForgeEnchantment['kind'], string> = {
  damage: 'Adds damage',
  conditional: 'Situational',
  effect: '',
};

/**
 * A searchable list of the enchantments that fit this item (a combobox in a popover). Picks that
 * already sit in another slot are listed but disabled, so the same one cannot be added twice.
 */
export function EnchantmentPicker({
  slotLabel,
  options,
  value,
  takenIn,
  onSelect,
  disabled,
}: {
  /** "Slot 1" */
  slotLabel: string;
  options: readonly ForgeEnchantment[];
  /** Slug of the enchantment in this slot. */
  value: string | undefined;
  /** Slug → label of the slot that holds it ("Slot 2"), for the other slots. */
  takenIn: ReadonlyMap<string, string>;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.slug === value);
  const visible = current ? current.name : 'Add enchantment';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${slotLabel}: ${visible}`}
          className={cn(
            'inline-flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-sm border bg-surface-2 px-3 text-left text-sm font-semibold',
            current ? 'border-control text-text' : 'border-dashed border-control text-muted',
            'hover:border-accent disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {current ? (
              <Icon src={current.image} />
            ) : (
              <Plus size={18} aria-hidden="true" className="shrink-0" />
            )}
            <span className="truncate">{visible}</span>
          </span>
          <ChevronDown size={16} aria-hidden="true" className="shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] p-0">
        <Command label={`Choose an enchantment for ${slotLabel}`} className="flex flex-col">
          <Command.Input
            placeholder="Search enchantments…"
            className="h-12 border-b border-line bg-transparent px-4 text-sm text-text outline-none placeholder:text-muted"
          />
          <Command.List className="max-h-72 overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
              No enchantment matches.
            </Command.Empty>
            {options.map((option) => {
              const takenBy = option.slug === value ? undefined : takenIn.get(option.slug);
              return (
                <Command.Item
                  key={option.slug}
                  value={option.name}
                  keywords={[option.slug]}
                  disabled={takenBy !== undefined}
                  onSelect={() => {
                    onSelect(option.slug);
                    setOpen(false);
                  }}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-2 py-1.5 text-sm text-text data-[disabled=true]:cursor-not-allowed data-[selected=true]:bg-accent/20"
                >
                  <Icon src={option.image} />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate font-semibold',
                      takenBy && 'font-normal line-through decoration-muted',
                    )}
                  >
                    {option.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {takenBy ?? HINT[option.kind]}
                  </span>
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
