/**
 * Log-linear interpolation of a documented power table (`[ Plans ]/07-FEATURES-SPEC.md` §2).
 * Damage grows roughly exponentially with power, so between two rows the logarithm of the
 * minimum and of the maximum is interpolated linearly in power. Tables are sorted by power
 * (checked against the real data by a unit test).
 */

/** One row of a power table: damage (weapons) or bonus health (armor) at a power level. */
export interface PowerPoint {
  power: number;
  min: number;
  max: number;
}

export interface Range {
  min: number;
  max: number;
}

export interface Sample extends Range {
  /** `power` is exactly a row of the table, so the values are the row's own. */
  documented: boolean;
  /** `power` lies outside the rows, so the nearest segment's slope was continued. */
  outside: boolean;
}

/**
 * `a` → `b` at fraction `t` on a logarithmic scale (`t` may leave 0..1 to continue the slope).
 * A zero or negative end has no logarithm (armor health is 0 at power 1), so that segment is
 * a straight line instead. Never below 0.
 */
export function logLerp(a: number, b: number, t: number): number {
  if (a <= 0 || b <= 0) return Math.max(0, a + (b - a) * t);
  return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
}

/** The row closest to `power` (the lower one on a tie), or `undefined` for an empty table. */
export function nearestPoint(table: readonly PowerPoint[], power: number): PowerPoint | undefined {
  let best: PowerPoint | undefined;
  for (const point of table) {
    if (!best || Math.abs(point.power - power) < Math.abs(best.power - power)) best = point;
  }
  return best;
}

/**
 * The table's value at `power`. At a documented power the row itself is returned, untouched by
 * floating point. Between rows it is log-linear. Outside the rows the first or last segment's
 * slope is continued and `outside` is set. Needs at least two rows.
 */
export function sample(table: readonly PowerPoint[], power: number): Sample | undefined {
  if (table.length < 2) return undefined;
  // Index casts: the table has ≥ 2 rows and `i` stays within [1, length - 1].
  const first = table[0] as PowerPoint;
  const last = table[table.length - 1] as PowerPoint;
  let i = 1;
  while (i < table.length - 1 && (table[i] as PowerPoint).power < power) i += 1;
  const upper = table[i] as PowerPoint;
  const lower = table[i - 1] as PowerPoint;
  const outside = power < first.power || power > last.power;
  for (const row of [lower, upper]) {
    if (row.power === power) return { min: row.min, max: row.max, documented: true, outside };
  }
  const t = (power - lower.power) / (upper.power - lower.power);
  return {
    min: logLerp(lower.min, upper.min, t),
    max: logLerp(lower.max, upper.max, t),
    documented: false,
    outside,
  };
}

/** Like {@link sample}, but `undefined` when `power` is outside the documented rows. */
export function interpolate(table: readonly PowerPoint[], power: number): Sample | undefined {
  const found = sample(table, power);
  return found && !found.outside ? found : undefined;
}
