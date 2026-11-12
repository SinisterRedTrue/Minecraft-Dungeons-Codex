'use client';

import { EnchantPicker } from '@/components/features/planner/EnchantPicker';
import { ItemPicker } from '@/components/features/planner/ItemPicker';
import type { PlannerLoaded } from '@/components/features/planner/usePlannerData';
import type { GameId } from '@/config/games';
import type { Pick } from '@/lib/forge/enchantments';
import type { BuiltInRow } from '@/lib/forge/types';
import type { Build } from '@/lib/planner/schema';
import { getSlot } from '@/lib/planner/slots';

// The dialogs have no trigger element Radix could return focus to, so focus goes back by hand.
const refocus = (key: string, selector: string) =>
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`[data-testid="slot-${key}"] ${selector}`)?.focus(),
  );

/** The item picker and the enchantment picker of whichever slot is being edited. */
export function PlannerPickers({
  game,
  build,
  loaded,
  pickerKey,
  enchantKey,
  onClosePicker,
  onCloseEnchant,
  onItem,
  onPicks,
}: {
  game: GameId;
  build: Build;
  loaded: PlannerLoaded;
  pickerKey: string | null;
  enchantKey: string | null;
  onClosePicker: () => void;
  onCloseEnchant: () => void;
  onItem: (key: string, slug: string) => void;
  onPicks: (key: string, picks: Pick[]) => void;
}) {
  const { data, catalog, catalogBySlug } = loaded;
  const pickerSlot = pickerKey ? getSlot(game, pickerKey) : undefined;
  const enchantSlot = enchantKey ? getSlot(game, enchantKey) : undefined;

  const builtInsOf = (key: string): BuiltInRow[] => {
    const slot = getSlot(game, key);
    const choice = build.slots[key];
    const item = slot && choice && data.item(slot.category, choice.slug);
    const list = (item?.builtInEnchantments ?? []) as { enchantmentId: string }[];
    return list.flatMap(({ enchantmentId }) => {
      const slug = enchantmentId.split(':')[2] ?? '';
      const enchantment = catalogBySlug.get(slug);
      return enchantment
        ? [
            {
              slug,
              name: enchantment.name,
              href: `/${game}/enchantments/${slug}`,
              ...(enchantment.image ? { image: enchantment.image } : {}),
            },
          ]
        : [];
    });
  };

  return (
    <>
      {pickerSlot && (
        <ItemPicker
          slot={pickerSlot}
          data={data}
          open
          onOpenChange={(open) => {
            if (open) return;
            onClosePicker();
            refocus(pickerSlot.key, 'button');
          }}
          selectedSlug={build.slots[pickerSlot.key]?.slug}
          onSelect={(slug) => onItem(pickerSlot.key, slug)}
        />
      )}
      {enchantSlot && build.slots[enchantSlot.key] && (
        <EnchantPicker
          slot={enchantSlot}
          itemName={
            data.item(enchantSlot.category, build.slots[enchantSlot.key]?.slug ?? '')?.name ?? ''
          }
          catalog={catalog}
          picks={build.slots[enchantSlot.key]?.picks ?? []}
          builtIns={builtInsOf(enchantSlot.key)}
          open
          onOpenChange={(open) => {
            if (open) return;
            onCloseEnchant();
            refocus(enchantSlot.key, 'button[aria-label^="Enchant "]');
          }}
          onChange={(picks) => onPicks(enchantSlot.key, picks)}
        />
      )}
    </>
  );
}
