/**
 * Category curves (`data/forge/{game}/curves.json`, built by `scripts/pipeline/forge.ts`): the
 * median damage multiplier per power level for each weapon type and kind, and the median armor
 * health. Items without their own documented table are scaled along these, so every number they
 * produce is Approximate.
 */
import { sample, type PowerPoint } from './interpolate';

export interface Curve {
  /** Documented power levels, ascending. */
  powers: number[];
  min: number[];
  max: number[];
  samples: number[];
}

/** Power-1 damage per point of the wiki's 0–14 damage rating (median over weapons with tables). */
export interface Baseline {
  min: number;
  max: number;
  samples: number;
}

/** The curves one item needs, picked on the server so the page ships a few kB, not the whole file. */
export interface ItemCurves {
  /** The item's weapon-type curve, if its type has one. */
  type?: Curve;
  /** The melee / ranged curve (weapons) or the armor health curve. */
  kind?: Curve;
  /** Rating → power-1 damage, weapons only. */
  baseline?: Baseline;
}

export interface Multiplier {
  min: number;
  max: number;
  /** `power` lies outside the curve, so the last segment's slope was continued. */
  extrapolated: boolean;
}

const pointsCache = new WeakMap<Curve, PowerPoint[]>();

/** The curve as rows (cached per curve object). The three arrays have equal length. */
export function curvePoints(curve: Curve): PowerPoint[] {
  let points = pointsCache.get(curve);
  if (!points) {
    points = curve.powers.map((power, i) => ({
      power,
      min: curve.min[i] as number,
      max: curve.max[i] as number,
    }));
    pointsCache.set(curve, points);
  }
  return points;
}

/** Highest documented power of a curve (0 for an empty one). */
export function curveTop(curve: Curve | undefined): number {
  return curve ? Math.max(0, ...curve.powers) : 0;
}

/**
 * The curve's values at `power`: log-linear between its points; below the first or above the
 * last point the nearest segment's slope is continued and `extrapolated` is set. `undefined`
 * when the curve has fewer than two points.
 */
export function multiplierAt(curve: Curve, power: number): Multiplier | undefined {
  const found = sample(curvePoints(curve), power);
  return found && { min: found.min, max: found.max, extrapolated: found.outside };
}

/**
 * The curve to scale a weapon along: its type curve when that reaches `power`, else the kind
 * curve when that does, else whichever reaches higher (and is then extrapolated).
 */
export function pickCurve(curves: ItemCurves, power: number): Curve | undefined {
  const { type, kind } = curves;
  if (type && curveTop(type) >= power) return type;
  if (kind && curveTop(kind) >= power) return kind;
  return curveTop(kind) > curveTop(type) ? kind : (type ?? kind);
}
