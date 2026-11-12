/**
 * The Build Planner's slots (`[ Plans ]/07-FEATURES-SPEC.md` §5, D-051).
 *
 * - **Dungeons:** Melee, Ranged, Armor and Artifact ×3. Each gear item has 3 enchantment slots.
 * - **Dungeons II:** Melee, Ranged, Helmet, Chestplate, Leggings, Boots, Artifact ×3 and
 *   Talisman ×3. Each weapon and armor piece holds **one** enchantment; talismans carry a tier.
 *
 * A slot's `scope` pre-filters its picker (a Helmet slot only lists helmets), so an item in the
 * wrong slot is impossible.
 */
import type { GameId } from '@/config/games';
import type { EnchantmentTarget } from '@/lib/forge/enchantments';

export type SlotCategory = 'weapons' | 'armor' | 'artifacts' | 'talismans';

export interface SlotScope {
  /** List-item field the slot is restricted on (`kind`, `slot`). */
  field: string;
  value: string;
}

export interface SlotDef {
  key: string;
  label: string;
  category: SlotCategory;
  scope?: SlotScope;
  /** Which enchantments fit (`appliesTo`); absent for slots that take none. */
  target?: EnchantmentTarget;
  /** How many enchantments the slot holds (0 for artifacts and talismans). */
  enchantSlots: number;
  /** The item's tier is chosen too (D2 talismans). */
  tiered?: boolean;
}

const artifacts = (): SlotDef[] =>
  [1, 2, 3].map((n) => ({
    key: `artifact${n}`,
    label: `Artifact ${n}`,
    category: 'artifacts',
    enchantSlots: 0,
  }));

const D1_SLOTS: readonly SlotDef[] = [
  {
    key: 'melee',
    label: 'Melee',
    category: 'weapons',
    scope: { field: 'kind', value: 'melee' },
    target: 'melee',
    enchantSlots: 3,
  },
  {
    key: 'ranged',
    label: 'Ranged',
    category: 'weapons',
    scope: { field: 'kind', value: 'ranged' },
    target: 'ranged',
    enchantSlots: 3,
  },
  { key: 'armor', label: 'Armor', category: 'armor', target: 'armor', enchantSlots: 3 },
  ...artifacts(),
];

const D2_ARMOR_SLOTS = [
  ['helmet', 'Helmet'],
  ['chestplate', 'Chestplate'],
  ['leggings', 'Leggings'],
  ['boots', 'Boots'],
] as const;

const D2_SLOTS: readonly SlotDef[] = [
  {
    key: 'melee',
    label: 'Melee',
    category: 'weapons',
    scope: { field: 'kind', value: 'melee' },
    target: 'melee',
    enchantSlots: 1,
  },
  {
    key: 'ranged',
    label: 'Ranged',
    category: 'weapons',
    scope: { field: 'kind', value: 'ranged' },
    target: 'ranged',
    enchantSlots: 1,
  },
  ...D2_ARMOR_SLOTS.map(([key, label]): SlotDef => ({
    key,
    label,
    category: 'armor',
    scope: { field: 'slot', value: key },
    target: 'armor',
    enchantSlots: 1,
  })),
  ...artifacts(),
  ...[1, 2, 3].map((n): SlotDef => ({
    key: `talisman${n}`,
    label: `Talisman ${n}`,
    category: 'talismans',
    enchantSlots: 0,
    tiered: true,
  })),
];

export const SLOTS: Readonly<Record<GameId, readonly SlotDef[]>> = { d1: D1_SLOTS, d2: D2_SLOTS };

export const slotsFor = (game: GameId): readonly SlotDef[] => SLOTS[game];

export const getSlot = (game: GameId, key: string): SlotDef | undefined =>
  SLOTS[game].find((slot) => slot.key === key);

/** The categories the planner needs data for, in slot order. */
export function plannerCategories(game: GameId): SlotCategory[] {
  return [...new Set(SLOTS[game].map((slot) => slot.category))];
}

/** Whether items of this category can go into the planner (drives "Open in Planner"). */
export const isPlannable = (game: GameId, category: string): boolean =>
  SLOTS[game].some((slot) => slot.category === category);

/** The fields of an item that decide its slot. */
export interface SlotFields {
  kind?: unknown;
  slot?: unknown;
}

/**
 * The slot an item belongs to when it is sent to the planner: gear goes to its own slot (a
 * replacement), artifacts and talismans take the first free slot, or the last one when all are
 * taken. `undefined` when the item cannot be planned (a weapon without a kind).
 */
export function slotForItem(
  game: GameId,
  category: string,
  fields: SlotFields,
  occupied: ReadonlySet<string>,
): string | undefined {
  const candidates = SLOTS[game].filter((slot) => slot.category === category);
  const matching = candidates.filter(
    (slot) => !slot.scope || fields[slot.scope.field as keyof SlotFields] === slot.scope.value,
  );
  const first = matching[0];
  if (!first) return undefined;
  if (first.scope) return first.key;
  // Artifacts and talismans: the first free slot, or the last one when all are taken.
  const free = matching.find((slot) => !occupied.has(slot.key));
  return (free ?? (matching.at(-1) as SlotDef)).key;
}
