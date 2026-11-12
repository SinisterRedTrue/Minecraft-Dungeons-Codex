/** Minimal valid entities for every category, for schema, loader and validator tests. */
import { slugify } from '@/lib/utils/slugify';

type Json = Record<string, unknown>;

export function base(game: 'd1' | 'd2', category: string, name: string, extra: Json = {}): Json {
  const slug = slugify(name);
  return {
    id: `${game}:${category}:${slug}`,
    slug,
    game,
    category,
    name,
    tags: [],
    related: [],
    source: {
      title: `${game === 'd1' ? 'Dungeons' : 'Dungeons II'}:${name}`,
      url: `https://minecraft.wiki/w/${encodeURIComponent(name.replace(/ /g, '_'))}`,
      revisionId: 1,
      fetchedAt: '2026-11-12T10:00:00.000Z',
    },
    quality: 'verified',
    ...extra,
  };
}

const d1Item = {
  isUnique: false,
  variantIds: [],
  properties: [],
  builtInEnchantments: [],
  acceptsSoulEnchantments: false,
  locations: [],
  isSeasonal: false,
};

const enchantment = {
  appliesTo: ['melee'],
  tier: 'common',
  isGilded: false,
  levels: [{ level: 1, text: 'Deals 10% more damage', value: 10, unit: '%' }],
  pointCost: [1, 2, 3],
  stackable: false,
  mobObtainable: false,
  builtInto: [],
  section: 'standard',
};

const artifact = { requiresSouls: false, properties: [], locations: [] };
const mob = { mobType: 'common', attacks: [], locationIds: [], drops: [], variants: [] };
const location = { mobIds: [], itemIds: [] };

/** One valid entity per game/category, keyed `game/category`. */
export const VALID: Record<string, (name: string, extra?: Json) => Json> = {
  'd1/weapons': (n, e) =>
    base('d1', 'weapons', n, { ...d1Item, kind: 'melee', weaponType: 'sword', ...e }),
  'd1/armor': (n, e) =>
    base('d1', 'armor', n, { ...d1Item, armorGroup: 'champions', effects: [], ...e }),
  'd1/enchantments': (n, e) => base('d1', 'enchantments', n, { ...enchantment, ...e }),
  'd1/artifacts': (n, e) =>
    base('d1', 'artifacts', n, { ...artifact, artifactType: 'damaging', ...e }),
  'd1/dlcs': (n, e) =>
    base('d1', 'dlcs', n, {
      order: 1,
      summary: 'A DLC.',
      locationIds: [],
      contentCounts: { weapons: 0, armor: 0, artifacts: 0, mobs: 0, enchantments: 0 },
      ...e,
    }),
  'd1/cosmetics': (n, e) =>
    base('d1', 'cosmetics', n, { cosmeticType: 'cape', obtainedFrom: 'event', ...e }),
  'd1/mobs': (n, e) => base('d1', 'mobs', n, { ...mob, ...e }),
  'd1/locations': (n, e) =>
    base('d1', 'locations', n, { ...location, locationType: 'mission', ...e }),
  'd2/weapons': (n, e) =>
    base('d2', 'weapons', n, {
      kind: 'melee',
      weaponType: 'staff',
      effect: 'None',
      effectValues: [],
      locations: [],
      obtainable: true,
      ...e,
    }),
  'd2/armor': (n, e) =>
    base('d2', 'armor', n, {
      slot: 'helmet',
      armorSet: 'Iron',
      effects: [],
      effectValues: [],
      locations: [],
      ...e,
    }),
  'd2/enchantments': (n, e) => base('d2', 'enchantments', n, { ...enchantment, ...e }),
  'd2/artifacts': (n, e) =>
    base('d2', 'artifacts', n, { ...artifact, artifactType: 'damaging', ...e }),
  'd2/talismans': (n, e) =>
    base('d2', 'talismans', n, {
      passiveBonus: 'Increases ranged damage',
      boostType: 'ranged',
      isSecret: true,
      tiers: [
        { tier: 1, text: '10%', value: 10, unit: '%' },
        { tier: 2, text: '15%', value: 15, unit: '%' },
        { tier: 3, text: '25%', value: 25, unit: '%' },
      ],
      sourceType: 'quest-reward',
      locations: [],
      ...e,
    }),
  'd2/quests': (n, e) =>
    base('d2', 'quests', n, {
      questType: 'core',
      locationIds: [],
      rewards: [{ when: 'first', xp: 100, items: [] }],
      dlcExclusive: false,
      ...e,
    }),
  'd2/mobs': (n, e) => base('d2', 'mobs', n, { ...mob, ...e }),
  'd2/locations': (n, e) =>
    base('d2', 'locations', n, { ...location, locationType: 'region', ...e }),
};
