/** Stat bars: each stat is drawn relative to the largest value in its category. */
import type { StatRowSpec } from '@/config/detail';
import { getValues } from '@/lib/filters/path';

export interface StatItem {
  label: string;
  value: number;
  /** The category maximum the bar is scaled to. */
  max: number;
  unit?: string;
}

type Source = Readonly<Record<string, unknown>>;

function numberAt(source: Source, field: string): number | undefined {
  const value = getValues(source, field)[0];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** The largest value of each stat field over a list of items (list items carry the derived fields). */
export function computeMaxima(
  specs: readonly StatRowSpec[],
  items: readonly Source[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const { field } of specs) {
    let max = 0;
    for (const item of items) max = Math.max(max, numberAt(item, field) ?? 0);
    out[field] = max;
  }
  return out;
}

/** The stats this entity has, in config order; missing ones leave no bar. */
export function buildStats(
  specs: readonly StatRowSpec[],
  source: Source,
  maxima: Readonly<Record<string, number>>,
): StatItem[] {
  const out: StatItem[] = [];
  for (const spec of specs) {
    const value = numberAt(source, spec.field);
    if (value === undefined) continue;
    const max = Math.max(maxima[spec.field] ?? 0, value);
    out.push({ label: spec.label, value, max, ...(spec.unit ? { unit: spec.unit } : {}) });
  }
  return out;
}
