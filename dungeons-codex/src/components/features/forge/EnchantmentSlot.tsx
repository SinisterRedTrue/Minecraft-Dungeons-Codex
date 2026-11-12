'use client';

import { Lock, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { ToggleGroup } from '@/components/ui/ToggleGroup';
import type { BuiltInRow } from '@/lib/forge/types';
import type { ForgeEnchantment, Pick, Tier } from '@/lib/forge/enchantments';
import { EnchantmentPicker } from './EnchantmentPicker';

const TIERS = [
  { value: '1', label: 'I', ariaLabel: 'Tier I' },
  { value: '2', label: 'II', ariaLabel: 'Tier II' },
  { value: '3', label: 'III', ariaLabel: 'Tier III' },
] as const;

/** One pick: a searchable enchantment list, a tier I / II / III switch and a remove button. */
export function EnchantmentSlot({
  index,
  options,
  pick,
  takenIn,
  onSelect,
  onTier,
  onRemove,
}: {
  index: number;
  options: readonly ForgeEnchantment[];
  pick: Pick | undefined;
  takenIn: ReadonlyMap<string, string>;
  onSelect: (slug: string) => void;
  onTier: (tier: Tier) => void;
  onRemove: () => void;
}) {
  const label = `Slot ${index + 1}`;
  const name = pick ? options.find((o) => o.slug === pick.slug)?.name : undefined;
  return (
    <li className="grid gap-2 @md:grid-cols-[minmax(0,1fr)_auto] @md:items-center">
      <EnchantmentPicker
        slotLabel={label}
        options={options}
        value={pick?.slug}
        takenIn={takenIn}
        onSelect={onSelect}
      />
      <div className="flex items-center gap-2">
        <ToggleGroup
          aria-label={`${label} tier`}
          // No tier is selected until the slot holds an enchantment.
          value={pick ? String(pick.tier) : ''}
          onValueChange={(value) => onTier(Number(value) as Tier)}
          options={TIERS}
          disabled={!pick}
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={!pick}
          aria-label={`Remove ${name ?? label}`}
          className="grid size-11 cursor-pointer place-items-center rounded-sm text-muted hover:bg-surface-2 hover:text-text disabled:invisible"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
}

/** An enchantment the item comes with: shown, linked, never editable. */
export function BuiltInRowView({ row }: { row: BuiltInRow }) {
  return (
    <li className="flex min-h-11 items-center gap-3 rounded-sm border border-line bg-surface-2 px-3 py-1.5">
      {row.image ? (
        <Image
          src={row.image}
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7 shrink-0 [image-rendering:pixelated]"
        />
      ) : null}
      <Link
        href={row.href}
        className="min-w-0 flex-1 truncate text-sm font-semibold text-text underline-offset-4 hover:underline"
      >
        {row.name}
      </Link>
      <Badge variant="partial" className="shrink-0">
        <Lock size={11} aria-hidden="true" />
        Built in
      </Badge>
    </li>
  );
}
