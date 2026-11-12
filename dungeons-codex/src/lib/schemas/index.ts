/**
 * Schema registry: `schemaFor(game, category)` plus every inferred entity type.
 * Normative source: `[ RoadMap ]/[ Plans ]/03-CONTENT-MODEL.md`.
 */
import type { z } from 'zod';
import type { CategorySlug, GameId } from '@/config/games';
import type { SchemaOptions } from './base';
import { d1ArmorSchema, type D1Armor } from './d1/armor';
import { d1ArtifactSchema, type D1Artifact } from './d1/artifacts';
import { d1CosmeticSchema, type D1Cosmetic } from './d1/cosmetics';
import { d1DlcSchema, type D1Dlc } from './d1/dlcs';
import { d1EnchantmentSchema, type D1Enchantment } from './d1/enchantments';
import { d1LocationSchema, type D1Location } from './d1/locations';
import { d1MobSchema, type D1Mob } from './d1/mobs';
import { d1WeaponSchema, type D1Weapon } from './d1/weapons';
import { d2ArmorSchema, type D2Armor } from './d2/armor';
import { d2ArtifactSchema, type D2Artifact } from './d2/artifacts';
import { d2EnchantmentSchema, type D2Enchantment } from './d2/enchantments';
import { d2LocationSchema, type D2Location } from './d2/locations';
import { d2MobSchema, type D2Mob } from './d2/mobs';
import { d2QuestSchema, type D2Quest } from './d2/quests';
import { d2TalismanSchema, type D2Talisman } from './d2/talismans';
import { d2WeaponSchema, type D2Weapon } from './d2/weapons';

export * from './base';
export * from './d1/armor';
export * from './d1/artifacts';
export * from './d1/cosmetics';
export * from './d1/dlcs';
export * from './d1/enchantments';
export * from './d1/locations';
export * from './d1/mobs';
export * from './d1/weapons';
export * from './d2/armor';
export * from './d2/artifacts';
export * from './d2/enchantments';
export * from './d2/locations';
export * from './d2/mobs';
export * from './d2/quests';
export * from './d2/talismans';
export * from './d2/weapons';

/** Entity type for every game/category pair. */
export interface EntityMap {
  d1: {
    weapons: D1Weapon;
    armor: D1Armor;
    enchantments: D1Enchantment;
    artifacts: D1Artifact;
    dlcs: D1Dlc;
    cosmetics: D1Cosmetic;
    mobs: D1Mob;
    locations: D1Location;
  };
  d2: {
    weapons: D2Weapon;
    armor: D2Armor;
    enchantments: D2Enchantment;
    artifacts: D2Artifact;
    talismans: D2Talisman;
    quests: D2Quest;
    mobs: D2Mob;
    locations: D2Location;
  };
}

export type EntityOf<G extends GameId, C extends CategorySlug<G>> = C extends keyof EntityMap[G]
  ? EntityMap[G][C]
  : never;

export type D1Entity = EntityMap['d1'][keyof EntityMap['d1']];
export type D2Entity = EntityMap['d2'][keyof EntityMap['d2']];
export type Entity = D1Entity | D2Entity;

/** Fields every list projection carries (§6); categories add their `listFields`. */
export const LIST_BASE_FIELDS = [
  'id',
  'slug',
  'name',
  'image',
  'rarity',
  'dlc',
  'tags',
  'quality',
] as const;

export type EntityListBase = Pick<Entity, (typeof LIST_BASE_FIELDS)[number]> & {
  game: GameId;
  category: string;
};

/** A slim entity for cards, tables and filters: the base fields plus the category's `listFields`. */
export type EntityListItem = EntityListBase & Record<string, unknown>;

type SchemaFactory = (opts?: SchemaOptions) => z.ZodType;

const FACTORIES: { [G in GameId]: Record<CategorySlug<G>, SchemaFactory> } = {
  d1: {
    weapons: d1WeaponSchema,
    armor: d1ArmorSchema,
    enchantments: d1EnchantmentSchema,
    artifacts: d1ArtifactSchema,
    dlcs: d1DlcSchema,
    cosmetics: d1CosmeticSchema,
    mobs: d1MobSchema,
    locations: d1LocationSchema,
  },
  d2: {
    weapons: d2WeaponSchema,
    armor: d2ArmorSchema,
    enchantments: d2EnchantmentSchema,
    artifacts: d2ArtifactSchema,
    talismans: d2TalismanSchema,
    quests: d2QuestSchema,
    mobs: d2MobSchema,
    locations: d2LocationSchema,
  },
};

/**
 * The Zod schema for one game/category. Pass `vocab` (from `data/vocab/{game}/enums.json`)
 * to restrict the *(open)* enums to known values.
 */
export function schemaFor<G extends GameId, C extends CategorySlug<G>>(
  game: G,
  category: C,
  opts: SchemaOptions = {},
): z.ZodType<EntityOf<G, C>> {
  const factory = (FACTORIES[game] as Record<string, SchemaFactory | undefined>)[category];
  if (!factory) throw new Error(`Unknown category "${category}" for game "${game}"`);
  return factory(opts) as z.ZodType<EntityOf<G, C>>;
}
