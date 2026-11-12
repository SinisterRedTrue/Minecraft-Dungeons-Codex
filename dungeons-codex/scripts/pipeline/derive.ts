/**
 * Derived fields (`[ Plans ]/04-DATA-PIPELINE.md` task 3): everything that depends on more than
 * one entity. Safe to run on freshly linked drafts and on finished entities read from disk.
 */
import { GROUP_FIELD } from '@/config/categories';
import { compareByName } from '../lib/data-files';
import { listOf, type Ent, type GameData } from './types';

const sorted = (values: Iterable<string>) => [...new Set(values)].sort();
const KIND_ORDER = ['melee', 'ranged', 'armor'];

function builtInIds(item: Ent): string[] {
  const list = item.builtInEnchantments;
  return Array.isArray(list)
    ? list.map((b) => String((b as { enchantmentId: string }).enchantmentId))
    : [];
}

/** Enchantment ↔ item symmetry, exclusive enchantments' `appliesTo`. */
function deriveBuiltIn(data: GameData): void {
  const equipment = [...(data.weapons ?? []), ...(data.armor ?? [])];
  const byId = new Map(equipment.map((e) => [e.id, e]));
  const enchantments = new Map((data.enchantments ?? []).map((e) => [e.id, e]));

  for (const item of equipment) {
    for (const enchantmentId of builtInIds(item)) {
      const enchantment = enchantments.get(enchantmentId);
      if (enchantment) enchantment.builtInto = sorted([...listOf(enchantment.builtInto), item.id]);
    }
  }
  for (const enchantment of enchantments.values()) {
    const into = listOf(enchantment.builtInto).filter((id) => byId.has(id));
    enchantment.builtInto = sorted(into);
    for (const id of into) {
      const item = byId.get(id);
      if (item && !builtInIds(item).includes(enchantment.id)) {
        const list = (item.builtInEnchantments as { enchantmentId: string }[] | undefined) ?? [];
        item.builtInEnchantments = [...list, { enchantmentId: enchantment.id }];
      }
    }
    if (enchantment.section !== 'standard') {
      const kinds = into.map((id) => {
        const item = byId.get(id);
        return item?.category === 'armor' ? 'armor' : String(item?.kind ?? '');
      });
      const applies = new Set([...listOf(enchantment.appliesTo), ...kinds]);
      enchantment.appliesTo = KIND_ORDER.filter((k) => applies.has(k));
    }
  }
}

/** DLC missions, `itemIds`, mob ↔ location symmetry, DLC content counts. */
function deriveLinks(data: GameData): void {
  const locations = data.locations ?? [];
  for (const dlc of data.dlcs ?? []) {
    for (const id of listOf(dlc.locationIds)) {
      const location = locations.find((l) => l.id === id);
      if (!location) continue;
      location.dlc ??= dlc.slug;
      if (location.locationType === 'mission') location.locationType = 'dlc-mission';
    }
  }

  const itemsAt = new Map<string, Set<string>>();
  for (const category of ['weapons', 'armor', 'artifacts']) {
    for (const item of data[category] ?? []) {
      for (const where of listOf(item.locations)) {
        if (!where.startsWith('d1:locations:')) continue;
        const set = itemsAt.get(where) ?? new Set<string>();
        set.add(item.id);
        itemsAt.set(where, set);
      }
    }
  }
  const mobIdSet = new Set((data.mobs ?? []).map((m) => m.id));
  const locationIdSet = new Set(locations.map((l) => l.id));
  const mobsAt = new Map<string, Set<string>>();
  for (const mob of data.mobs ?? []) {
    mob.locationIds = sorted(listOf(mob.locationIds).filter((id) => locationIdSet.has(id)));
  }
  for (const location of locations) {
    for (const id of listOf(location.mobIds)) {
      if (!mobIdSet.has(id)) continue;
      const mob = (data.mobs ?? []).find((m) => m.id === id);
      if (mob) mob.locationIds = sorted([...listOf(mob.locationIds), location.id]);
    }
  }
  for (const mob of data.mobs ?? []) {
    for (const id of listOf(mob.locationIds)) {
      const set = mobsAt.get(id) ?? new Set<string>();
      set.add(mob.id);
      mobsAt.set(id, set);
    }
  }
  for (const location of locations) {
    location.itemIds = sorted(itemsAt.get(location.id) ?? []);
    location.mobIds = sorted([
      ...listOf(location.mobIds).filter((id) => mobIdSet.has(id)),
      ...(mobsAt.get(location.id) ?? []),
    ]);
  }

  for (const dlc of data.dlcs ?? []) {
    const count = (category: string) =>
      (data[category] ?? []).filter((e) => e.dlc === dlc.slug).length;
    dlc.contentCounts = {
      weapons: count('weapons'),
      armor: count('armor'),
      artifacts: count('artifacts'),
      mobs: count('mobs'),
      enchantments: count('enchantments'),
    };
    dlc.locationIds = sorted(listOf(dlc.locationIds));
  }
}

/** The next `limit` members of `members` after `self`, wrapping, so neighbours differ per entity. */
function neighbours(members: Ent[], self: Ent, limit: number, skip: Set<string>): string[] {
  const at = members.findIndex((m) => m.id === self.id);
  const out: string[] = [];
  for (let step = 1; step < members.length && out.length < limit; step++) {
    const member = members[(at + step) % members.length];
    if (member && member.id !== self.id && !skip.has(member.id)) out.push(member.id);
  }
  return out;
}

/** `related`: base ↔ variants, then up to 6 more of the same group (alphabetical neighbours). */
function deriveRelated(data: GameData): void {
  for (const [category, entities] of Object.entries(data)) {
    const groupField = (GROUP_FIELD.d1 as Record<string, string | undefined>)[category];
    const groups = new Map<string, Ent[]>();
    if (groupField) {
      for (const entity of entities) {
        const value = entity[groupField];
        if (typeof value !== 'string') continue;
        groups.set(value, [...(groups.get(value) ?? []), entity]);
      }
      for (const members of groups.values()) members.sort(compareByName);
    }
    for (const entity of entities) {
      const family: string[] = [];
      if (typeof entity.baseItemId === 'string') family.push(entity.baseItemId);
      family.push(...listOf(entity.variantIds).sort());
      const skip = new Set([entity.id, ...family]);
      const value = groupField ? entity[groupField] : undefined;
      const members = typeof value === 'string' ? (groups.get(value) ?? []) : [];
      const extra = neighbours(members, entity, 6, skip);
      entity.related = [...new Set([...family, ...extra])].filter((id) => id !== entity.id);
    }
  }
}

export function deriveGame(data: GameData): void {
  deriveBuiltIn(data);
  deriveLinks(data);
  deriveRelated(data);
}
