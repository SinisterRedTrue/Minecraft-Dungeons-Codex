/**
 * Damage and bonus health at a power level (`[ Plans ]/07-FEATURES-SPEC.md` §2). Pure functions.
 *
 *  1. The item's own table covers `power` → log-linear interpolation, exact (documented rows are
 *     returned untouched).
 *  2. The power is outside the table → the nearest documented row, scaled along the weapon-type
 *     curve (then the kind curve). Approximate, reason `off-table`.
 *  3. No table at all → weapons: the 0–14 damage rating times the per-kind baseline (median
 *     power-1 damage per rating point), scaled along the curve (reason `baseline`); armor: the
 *     median health curve itself (reason `curve`). Approximate.
 */
import { multiplierAt, pickCurve, type ItemCurves } from './curves';
import { interpolate, nearestPoint, type PowerPoint, type Range } from './interpolate';

export type Reason = 'off-table' | 'curve' | 'baseline';

/** What the Forge knows about one weapon or armor piece. */
export interface ForgeItem {
  powerTable?: readonly PowerPoint[];
  /** The wiki's 0–14 damage rating (`stats.damage`); weapons without a table start from it. */
  rating?: number;
  curves: ItemCurves;
}

export interface Value extends Range {
  approximate: boolean;
  /** Why the value is approximate; absent for the item's own documented table. */
  reason?: Reason;
  /** The curve itself had to be continued past its last documented power. */
  extrapolated: boolean;
  /** Between two documented rows (still exact by the spec, but not a documented row). */
  interpolated: boolean;
}

/** `multiplier`: curves are factors of the power-1 value (weapons); `absolute`: health (armor). */
type Mode = 'multiplier' | 'absolute';

/** Scales an anchor along a curve: anchor × curve(power) ÷ curve(anchor power). */
function scaleAnchor(anchor: number, atPower: number, atAnchor: number): number {
  return atAnchor > 0 ? (anchor * atPower) / atAnchor : atPower;
}

function resolve(item: ForgeItem, power: number, mode: Mode): Value | undefined {
  const table = item.powerTable ?? [];
  const own = interpolate(table, power);
  if (own) {
    return {
      min: own.min,
      max: own.max,
      approximate: false,
      extrapolated: false,
      interpolated: !own.documented,
    };
  }

  const curve = pickCurve(item.curves, power);
  const scale = curve && multiplierAt(curve, power);
  if (!curve || !scale) return undefined;
  const approximate = { approximate: true, extrapolated: scale.extrapolated, interpolated: false };

  // Case 2: the nearest documented row, moved along the curve.
  const anchor = nearestPoint(table, power);
  const reference = anchor && multiplierAt(curve, anchor.power);
  if (anchor && reference) {
    return {
      min: scaleAnchor(anchor.min, scale.min, reference.min),
      max: scaleAnchor(anchor.max, scale.max, reference.max),
      reason: 'off-table',
      ...approximate,
    };
  }

  // Case 3: no table. Health curves are absolute; damage curves need a power-1 value first.
  if (mode === 'absolute')
    return { min: scale.min, max: scale.max, reason: 'curve', ...approximate };
  const { rating } = item;
  const { baseline } = item.curves;
  if (!rating || rating <= 0 || !baseline) return undefined;
  return {
    min: rating * baseline.min * scale.min,
    max: rating * baseline.max * scale.max,
    reason: 'baseline',
    ...approximate,
  };
}

/** Damage per hit of a weapon at `power`; `undefined` when nothing is known to estimate it from. */
export function damageAt(item: ForgeItem, power: number): Value | undefined {
  return resolve(item, power, 'multiplier');
}

/** Bonus health of an armor piece at `power` (absolute values, not factors). */
export function healthAt(item: ForgeItem, power: number): Value | undefined {
  return resolve(item, power, 'absolute');
}

/** Human wording for a value's `reason`, shown in the Approximate tooltip. */
export function reasonText(
  value: Pick<Value, 'reason' | 'extrapolated'>,
  subject = 'damage',
): string {
  const tail = value.extrapolated
    ? ' The curve itself ends below this power, so its last slope was continued.'
    : '';
  switch (value.reason) {
    case 'off-table':
      return `This power is outside the item's documented table, so its nearest documented row was scaled along the typical ${subject} curve.${tail}`;
    case 'curve':
      return `The wiki documents no table for this item, so this is the median ${subject} of items that have one.${tail}`;
    case 'baseline':
      return `The wiki documents no power table for this item. The estimate starts from its damage rating and scales along the typical curve of its weapon type.${tail}`;
    default:
      return '';
  }
}
