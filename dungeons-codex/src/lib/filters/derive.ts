/**
 * Derived list fields (`[ Plans ]/06-FILTERS-SPEC.md` marks them "derived"): values the filters
 * and cards need that are not a plain field of the entity (a sum, a maximum, a parsed effect).
 * They are computed once at build time by `getListItems`, so the client ships a few numbers
 * instead of whole nested arrays.
 */
type Entity = Readonly<Record<string, unknown>>;
type Derived = Record<string, unknown>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** The D2 "Take less damage" style effects, i.e. real damage reduction (not companions' or dealt). */
const DAMAGE_REDUCTION = /^(take less damage|reduces damage taken)/i;

function d1Enchantment(e: Entity): Derived {
  const costs = list(e.pointCost).filter((n): n is number => typeof n === 'number');
  return {
    ...(costs.length > 0 ? { totalCost: costs.reduce((a, b) => a + b, 0) } : {}),
    ...(typeof e.gildedDescription === 'string' && e.gildedDescription !== ''
      ? { hasGilded: true }
      : {}),
  };
}

function hasDrops(e: Entity): Derived {
  return list(e.drops).length > 0 ? { hasDrops: true } : {};
}

function d2Weapon(e: Entity): Derived {
  const first = list(e.effectValues)[0];
  return isRecord(first) && first.unit === '%' && typeof first.value === 'number'
    ? { primaryEffect: first.value }
    : {};
}

function d2Armor(e: Entity): Derived {
  const match = list(e.effectValues).find(
    (v) => isRecord(v) && typeof v.label === 'string' && DAMAGE_REDUCTION.test(v.label),
  );
  // "Reduces damage taken by 25%" is parsed as -25; both spellings mean 25 % damage reduction.
  return isRecord(match) && typeof match.value === 'number'
    ? { damageReduction: Math.abs(match.value) }
    : {};
}

function d2Talisman(e: Entity): Derived {
  const tier = list(e.tiers)[2];
  return isRecord(tier) && typeof tier.value === 'number' ? { tierIIIValue: tier.value } : {};
}

function d2Quest(e: Entity): Derived {
  const rewards = list(e.rewards).filter(isRecord);
  const xp = rewards.map((r) => r.xp).filter((n): n is number => typeof n === 'number');
  const items = [...new Set(rewards.flatMap((r) => list(r.items)))];
  return {
    ...(xp.length > 0 ? { maxXp: Math.max(...xp) } : {}),
    ...(items.length > 0 ? { rewardItems: items } : {}),
  };
}

const DERIVERS: Readonly<Record<string, (e: Entity) => Derived>> = {
  'd1/enchantments': d1Enchantment,
  'd1/mobs': hasDrops,
  'd2/mobs': hasDrops,
  'd2/weapons': d2Weapon,
  'd2/armor': d2Armor,
  'd2/talismans': d2Talisman,
  'd2/quests': d2Quest,
};

/** Derived fields for one entity; `{}` for categories without any. */
export function deriveListFields(game: string, category: string, entity: Entity): Derived {
  return DERIVERS[`${game}/${category}`]?.(entity) ?? {};
}
