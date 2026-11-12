'use client';

import { useMemo } from 'react';
import { BuiltInRowView, EnchantmentSlot } from '@/components/features/forge/EnchantmentSlot';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/Dialog';
import {
  enchantmentsFor,
  type ForgeEnchantment,
  type Pick,
  type Tier,
} from '@/lib/forge/enchantments';
import type { BuiltInRow } from '@/lib/forge/types';
import type { SlotDef } from '@/lib/planner/slots';

/**
 * The enchantments of one gear slot: a searchable list of the enchantments that fit it (scoped by
 * `appliesTo`), a tier I / II / III switch per pick, and the item's built-in enchantments shown
 * locked. D1 gear has three picks, D2 gear one (D-051, D-088).
 */
export function EnchantPicker({
  slot,
  itemName,
  catalog,
  picks,
  builtIns,
  open,
  onOpenChange,
  onChange,
}: {
  slot: SlotDef;
  itemName: string;
  catalog: readonly ForgeEnchantment[];
  picks: readonly Pick[];
  builtIns: readonly BuiltInRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (picks: Pick[]) => void;
}) {
  // A slot that takes enchantments always has a target (see `slots.ts`).
  const options = useMemo(
    () => enchantmentsFor(catalog, slot.target as NonNullable<SlotDef['target']>),
    [catalog, slot.target],
  );
  const takenIn = useMemo(() => new Map(picks.map((p, i) => [p.slug, `Slot ${i + 1}`])), [picks]);

  const select = (index: number, slug: string) => {
    const next = [...picks];
    const current = next[index];
    if (current) next[index] = { slug, tier: current.tier };
    else next.push({ slug, tier: 1 });
    onChange(next);
  };
  const setTier = (index: number, tier: Tier) =>
    onChange(picks.map((p, i) => (i === index ? { ...p, tier } : p)));
  const remove = (index: number) => onChange(picks.filter((_, i) => i !== index));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Enchantments · ${slot.label}`}
        description={`${itemName}: ${slot.enchantSlots === 1 ? 'one enchantment' : `up to ${slot.enchantSlots} enchantments`}.`}
      >
        <div className="@container flex flex-col gap-4" data-testid="enchant-picker">
          {builtIns.length > 0 && (
            <ul
              aria-label="Built-in enchantments"
              className="m-0 flex list-none flex-col gap-2 p-0"
            >
              {builtIns.map((row) => (
                <BuiltInRowView key={row.slug} row={row} />
              ))}
            </ul>
          )}
          <ul aria-label="Enchantment slots" className="m-0 flex list-none flex-col gap-2 p-0">
            {Array.from({ length: slot.enchantSlots }, (_, i) => (
              <EnchantmentSlot
                key={i}
                index={i}
                options={options}
                pick={picks[i]}
                takenIn={takenIn}
                onSelect={(slug) => select(i, slug)}
                onTier={(tier) => setTier(i, tier)}
                onRemove={() => remove(i)}
              />
            ))}
          </ul>
          <p className="m-0 text-xs text-muted">
            Only enchantments that fit {slot.label.toLowerCase()} items are listed.
            {slot.enchantSlots > 1
              ? ' In the game you pick one of three per row; the planner simplifies this to one pick per slot.'
              : ''}
            {builtIns.length > 0
              ? ' Built-in enchantments cannot be changed, and their tier is not documented.'
              : ''}
          </p>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button3D size="sm">Done</Button3D>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
