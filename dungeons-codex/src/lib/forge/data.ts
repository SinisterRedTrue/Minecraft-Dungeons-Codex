/**
 * What a detail page hands to the Power Forge and the TierViewer. Runs on the server at build
 * time and keeps the payload small: only the curves this item needs (not the whole curves file),
 * its own power table and its resolved built-in enchantments. The enchantment catalog is not in
 * here; the Forge fetches `/forge/{game}.json` when it mounts.
 */
import 'server-only';
import d1Curves from '../../../data/forge/d1/curves.json';
import type { DetailData } from '@/lib/detail/context';
import type { Curve, ItemCurves } from './curves';
import type { EnchantmentTarget } from './enchantments';
import type { PowerPoint } from './interpolate';
import type { EffectRow, ForgeProps, TierProps } from './types';

interface CurvesFile {
  weapons: {
    melee?: Curve;
    ranged?: Curve;
    byWeaponType: Record<string, Curve>;
    baseline: { melee?: ItemCurves['baseline']; ranged?: ItemCurves['baseline'] };
  };
  armor: { health?: Curve };
}

const curves = d1Curves as unknown as CurvesFile;

/** Fields of weapons and armor the Forge reads, all optional (the two categories differ). */
interface GearFields {
  kind?: 'melee' | 'ranged';
  weaponType?: string;
  powerTable?: PowerPoint[];
  stats?: { damage?: number; speed?: number };
  builtInEnchantments?: { enchantmentId: string }[];
  baseHealth?: number;
  effects?: (EffectRow | string)[];
  effect?: string;
  effectNote?: string;
  effectValues?: EffectRow[];
}

/** `{ key: value }`, or `{}` when there is no value (keeps optional props truly absent). */
function present<K extends string, T>(key: K, value: T | undefined): { [P in K]?: T } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: T };
}

/** The Forge's props for a weapon or armor page; `undefined` for anything it does not cover. */
export function forgePropsFor(data: DetailData): ForgeProps | undefined {
  const { game, entity, refs } = data;
  if (data.category !== 'weapons' && data.category !== 'armor') return undefined;
  const category: 'weapons' | 'armor' = data.category;
  const gear = entity as unknown as GearFields;
  // Without a melee / ranged kind there is no telling which enchantments fit.
  if (category === 'weapons' && !gear.kind) return undefined;

  const builtIns = (gear.builtInEnchantments ?? []).flatMap(({ enchantmentId }) => {
    const ref = refs[enchantmentId];
    return ref
      ? [
          {
            slug: ref.slug,
            name: ref.name,
            href: ref.href,
            ...(ref.imageSrc ? { image: ref.imageSrc } : {}),
          },
        ]
      : [];
  });
  const target: EnchantmentTarget =
    category === 'armor' ? 'armor' : gear.kind === 'ranged' ? 'ranged' : 'melee';
  const base = { game, category, name: entity.name, target, builtIns };

  if (game === 'd2') {
    return {
      ...base,
      slots: 1,
      d2: {
        effects: [
          ...(gear.effect ? [gear.effect] : []),
          ...(gear.effects ?? []).filter((e): e is string => typeof e === 'string'),
        ],
        ...present('note', gear.effectNote),
        values: gear.effectValues ?? [],
      },
    };
  }

  if (category === 'weapons') {
    const kind = gear.kind === 'ranged' ? 'ranged' : 'melee';
    const type = gear.weaponType ? curves.weapons.byWeaponType[gear.weaponType] : undefined;
    const kindCurve = curves.weapons[kind];
    const baseline = curves.weapons.baseline[kind];
    return {
      ...base,
      slots: 3,
      item: {
        ...present('powerTable', gear.powerTable),
        ...present('rating', gear.stats?.damage),
        curves: {
          ...present('type', type),
          ...present('kind', kindCurve),
          ...present('baseline', baseline),
        },
      },
      ...present('speed', gear.stats?.speed),
    };
  }

  // Damage reduction is a derived field (read from the effect list), so it is on `source`.
  const derived = data.source as { damageReduction?: number };
  const armorEffects = (gear.effects ?? []).filter(
    (effect): effect is EffectRow => typeof effect === 'object',
  );
  return {
    ...base,
    slots: 3,
    item: {
      ...present('powerTable', gear.powerTable),
      curves: { ...present('kind', curves.armor.health) },
    },
    armor: {
      ...present('damageReduction', derived.damageReduction),
      ...present('baseHealth', gear.baseHealth),
      effects: armorEffects,
    },
  };
}

/** The TierViewer's props for an enchantment or a talisman page. */
export function tierPropsFor(data: DetailData): TierProps | undefined {
  const { entity } = data;
  const source = entity as unknown as {
    levels?: { level: number; text: string; value?: number; unit?: string }[];
    tiers?: { tier: number; text: string; value?: number; unit?: string }[];
    pointCost?: number[];
  };
  const rows = data.category === 'talismans' ? source.tiers : source.levels;
  if (!rows || rows.length === 0) return undefined;
  const tiers: TierProps['tiers'] = rows.flatMap((row) => {
    const tier = 'tier' in row ? row.tier : row.level;
    return tier === 1 || tier === 2 || tier === 3
      ? [{ tier, text: row.text, value: row.value, unit: row.unit }]
      : [];
  });
  return {
    kind: data.category === 'talismans' ? 'talisman' : 'enchantment',
    name: entity.name,
    tiers,
    ...(source.pointCost ? { pointCost: source.pointCost } : {}),
  };
}
