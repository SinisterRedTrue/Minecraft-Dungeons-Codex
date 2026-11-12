/**
 * Power Forge curves (`[ Plans ]/04-DATA-PIPELINE.md` "Power Forge data").
 *
 * For every weapon that has its own documented power table, normalise the table to its power-1
 * row (multiplier 1.0), then take the median multiplier at each documented power level, per
 * `weaponType` and per kind (melee / ranged). Items without a table use their type's curve, then
 * the kind's; those values are `approximate` in the Forge. Items with no table at all start from
 * their 0–14 damage rating times a per-kind `baseline` (median power-1 damage per rating point). Armor tables hold health, which is 0
 * at power 1, so armor curves are the median *absolute* min/max health per power.
 */
import type { Ent } from './types';

export interface PowerPoint {
  power: number;
  min: number;
  max: number;
}

export interface Curve {
  /** Documented power levels, ascending. */
  powers: number[];
  /** Median multiplier of the minimum damage relative to power 1. */
  min: number[];
  /** Median multiplier of the maximum damage relative to power 1. */
  max: number[];
  /** How many items' tables feed each power level (same order as `powers`). */
  samples: number[];
}

/** Power-1 damage per point of the wiki's 0–14 damage rating, for weapons that have no table. */
export interface Baseline {
  /** Median of (power-1 minimum ÷ damage rating). */
  min: number;
  /** Median of (power-1 maximum ÷ damage rating). */
  max: number;
  /** How many weapons' tables feed it. */
  samples: number;
}

export interface ForgeCurves {
  version: 1;
  basis: string;
  weapons: {
    melee?: Curve;
    ranged?: Curve;
    byWeaponType: Record<string, Curve>;
    /** Rating → power-1 damage, per kind (D-085). */
    baseline: { melee?: Baseline; ranged?: Baseline };
  };
  armor: { health?: Curve; basis: string };
  /** Items whose own table is used as-is (exact, not approximate). */
  itemsWithOwnTable: { weapons: string[]; armor: string[] };
}

const round = (n: number) => Math.round(n * 1e6) / 1e6;

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  return value ?? 0;
}

function tableOf(entity: Ent): PowerPoint[] {
  const table = entity.powerTable;
  return Array.isArray(table) ? (table as PowerPoint[]) : [];
}

/** A curve from tables; `normalise` divides by the power-1 (or first) row. */
export function buildCurve(tables: PowerPoint[][], normalise: boolean): Curve | undefined {
  const usable = tables
    .map((t) => [...t].sort((a, b) => a.power - b.power))
    .filter((t) => t.length >= 2);
  if (usable.length === 0) return undefined;
  const powers = [...new Set(usable.flatMap((t) => t.map((p) => p.power)))].sort((a, b) => a - b);
  const curve: Curve = { powers: [], min: [], max: [], samples: [] };
  for (const power of powers) {
    const mins: number[] = [];
    const maxs: number[] = [];
    for (const table of usable) {
      const row = table.find((p) => p.power === power);
      const base = table[0];
      if (!row || !base) continue;
      if (normalise) {
        if (base.min <= 0 || base.max <= 0) continue;
        mins.push(row.min / base.min);
        maxs.push(row.max / base.max);
      } else {
        mins.push(row.min);
        maxs.push(row.max);
      }
    }
    if (mins.length === 0) continue;
    curve.powers.push(power);
    curve.min.push(round(median(mins)));
    curve.max.push(round(median(maxs)));
    curve.samples.push(mins.length);
  }
  return curve.powers.length ? curve : undefined;
}

/** Power-1 damage ÷ `stats.damage` over the weapons of one kind that document a power-1 row. */
export function buildBaseline(weapons: Ent[]): Baseline | undefined {
  const mins: number[] = [];
  const maxs: number[] = [];
  for (const weapon of weapons) {
    const rating = (weapon.stats as { damage?: number } | undefined)?.damage;
    const first = [...tableOf(weapon)].sort((a, b) => a.power - b.power)[0];
    if (!rating || rating <= 0 || first?.power !== 1) continue;
    mins.push(first.min / rating);
    maxs.push(first.max / rating);
  }
  if (mins.length === 0) return undefined;
  return { min: round(median(mins)), max: round(median(maxs)), samples: mins.length };
}

export function buildForgeCurves(weapons: Ent[], armor: Ent[]): ForgeCurves {
  const withTable = weapons.filter((w) => tableOf(w).length >= 2);
  const byType = new Map<string, PowerPoint[][]>();
  for (const w of withTable) {
    const type = String(w.weaponType);
    byType.set(type, [...(byType.get(type) ?? []), tableOf(w)]);
  }
  const byWeaponType: Record<string, Curve> = {};
  for (const [type, tables] of [...byType].sort(([a], [b]) => a.localeCompare(b))) {
    const curve = buildCurve(tables, true);
    if (curve) byWeaponType[type] = curve;
  }
  const kind = (k: string) => buildCurve(withTable.filter((w) => w.kind === k).map(tableOf), true);
  const armorWithTable = armor.filter((a) => tableOf(a).length >= 2);
  const curves: ForgeCurves = {
    version: 1,
    basis:
      'min/max are multipliers of the power-1 damage (1.0 = power 1); medians over the items whose pages document a table',
    weapons: { byWeaponType, baseline: {} },
    armor: {
      basis: 'min/max are absolute health added at that power (power 1 adds about 0), medians',
    },
    itemsWithOwnTable: {
      weapons: withTable.map((w) => w.id).sort(),
      armor: armorWithTable.map((a) => a.id).sort(),
    },
  };
  const melee = kind('melee');
  const ranged = kind('ranged');
  if (melee) curves.weapons.melee = melee;
  if (ranged) curves.weapons.ranged = ranged;
  for (const k of ['melee', 'ranged'] as const) {
    const baseline = buildBaseline(withTable.filter((w) => w.kind === k));
    if (baseline) curves.weapons.baseline[k] = baseline;
  }
  const health = buildCurve(armorWithTable.map(tableOf), false);
  if (health) curves.armor.health = health;
  return curves;
}
