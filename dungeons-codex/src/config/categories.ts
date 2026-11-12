/**
 * Per-category config. `LIST_FIELDS` is what `getListItems` projects (`[ Plans ]/03-CONTENT-MODEL.md`
 * §6); `CATEGORY_DISPLAY` says how the browser shows it (`display/d1.ts`, `display/d2.ts`);
 * the filters live in `filters/`. Everything here is plain data, safe to import from the client.
 */
import { SECTIONS } from './sections';
import { GAMES, type CategorySlug, type GameId } from './games';
import type { EntityOf } from '@/lib/schemas';
import { D1_DISPLAY } from './display/d1';
import { D2_DISPLAY } from './display/d2';
import type { DisplayConfig } from './display/types';

export type { ColumnSpec, CompareRow, FieldFormat, StatSpec } from './display/types';

type ListFields = {
  [G in GameId]: { [C in CategorySlug<G>]: readonly (keyof EntityOf<G, C> & string)[] };
};

/**
 * Fields the list projection copies (plus the base fields and `game`/`category`). Fields the
 * filters read must be here; derived ones (`lib/filters/derive.ts`) are added on top.
 */
export const LIST_FIELDS: ListFields = {
  d1: {
    weapons: [
      'kind',
      'weaponType',
      'isUnique',
      'stats',
      'acceptsSoulEnchantments',
      'isSeasonal',
      'comboLength',
      'builtInEnchantments',
      'locations',
    ],
    armor: [
      'armorGroup',
      'isUnique',
      'damageReduction',
      'effects',
      'acceptsSoulEnchantments',
      'isSeasonal',
      'builtInEnchantments',
      'locations',
    ],
    enchantments: ['appliesTo', 'tier', 'stackable', 'mobObtainable', 'section'],
    artifacts: ['artifactType', 'cooldownSeconds', 'requiresSouls', 'locations'],
    dlcs: ['order', 'releaseDate', 'summary', 'contentCounts'],
    cosmetics: ['cosmeticType', 'obtainedFrom', 'season'],
    mobs: ['mobType', 'health', 'locationIds'],
    locations: ['locationType', 'region', 'mobIds'],
  },
  d2: {
    weapons: ['kind', 'weaponType', 'isUnique', 'comboLength', 'ammo', 'obtainable', 'locations'],
    armor: ['slot', 'armorSet', 'isUnique', 'locations'],
    enchantments: ['appliesTo', 'restriction'],
    artifacts: ['soulCost', 'cooldownSeconds', 'requiresSouls', 'locations'],
    talismans: ['boostType', 'isSecret', 'sourceType', 'passiveBonus', 'locations'],
    quests: ['questType', 'order', 'dlcExclusive', 'locationIds'],
    mobs: ['mobType', 'health', 'locationIds'],
    locations: ['locationType', 'region', 'mobIds'],
  },
};

/** The field that groups entities of a category ("same group" for related items). */
export const GROUP_FIELD: { [G in GameId]: Partial<Record<CategorySlug<G>, string>> } = {
  d1: {
    weapons: 'weaponType',
    armor: 'armorGroup',
    enchantments: 'tier',
    artifacts: 'artifactType',
    cosmetics: 'cosmeticType',
    mobs: 'mobType',
    locations: 'locationType',
  },
  d2: {
    weapons: 'weaponType',
    armor: 'armorSet',
    talismans: 'boostType',
    quests: 'questType',
    mobs: 'mobType',
    locations: 'locationType',
  },
};

const DISPLAY: { [G in GameId]: Record<CategorySlug<G>, DisplayConfig> } = {
  d1: D1_DISPLAY,
  d2: D2_DISPLAY,
};

export interface CategoryConfig extends DisplayConfig {
  label: string;
  /** One line under the H1. */
  intro: string;
  /** Entity id whose image represents the category (hub tile). */
  iconEntityId: string;
}

/** Everything the browser (and later pages) need to present one game/category. */
export function getCategoryConfig(game: GameId, category: string): CategoryConfig | undefined {
  const display = (DISPLAY[game] as Record<string, DisplayConfig | undefined>)[category];
  const section = (
    SECTIONS[game] as Record<string, (typeof SECTIONS)['d1']['weapons'] | undefined>
  )[category];
  if (!display || !section) return undefined;
  return {
    ...display,
    label: section.label,
    intro: section.description,
    iconEntityId: section.tileEntityId,
  };
}

/** The comparable categories of a game, in display order, with their labels. */
export function comparableCategories(game: GameId): { slug: string; label: string }[] {
  return (GAMES[game].categories as readonly string[]).flatMap((slug) => {
    const config = getCategoryConfig(game, slug);
    return config && config.compareRows.length > 0 ? [{ slug, label: config.label }] : [];
  });
}
