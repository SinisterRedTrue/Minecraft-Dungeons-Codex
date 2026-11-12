/**
 * Turns a list-item field into text for cards, tables and (later) the compare view.
 * Pure, so it is unit-tested; components only decide where the text goes.
 */
import type { FieldFormat, StatSpec } from '@/config/categories';
import { getValues } from '@/lib/filters/path';
import { labelForValue, type LabelMap } from '@/lib/filters/options';
import { humanize } from '@/lib/filters/tokens';
import { formatNumber, formatPercent, formatSeconds } from '@/lib/utils/format';

const date = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function formatOne(value: unknown, format: FieldFormat, field: string, labels?: LabelMap): string {
  switch (format) {
    case 'label':
      return labelForValue(field, value, labels);
    case 'rarity':
      return humanize(String(value));
    case 'decimal':
    case 'int':
      return typeof value === 'number' ? formatNumber(value) : String(value);
    case 'percent':
      return typeof value === 'number' ? formatPercent(value, { fraction: false }) : String(value);
    case 'seconds':
      return typeof value === 'number' ? formatSeconds(value) : String(value);
    case 'date': {
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? String(value) : date.format(parsed);
    }
    case 'bool':
      return value === true ? 'Yes' : 'No';
    case 'count':
    case 'text':
      return String(value);
  }
}

/**
 * The text for `field` of `item`, or `undefined` when the item has no value. Labels join with a
 * slash (an enchantment that applies to "Melee / Ranged"); everything else shows the first value.
 */
export function formatField(
  item: Readonly<Record<string, unknown>>,
  field: string,
  format: FieldFormat,
  labels?: LabelMap,
): string | undefined {
  const values = getValues(item, field);
  if (values.length === 0) return undefined;
  if (format === 'count') return String(values.length);
  if (format === 'label') return values.map((v) => formatOne(v, format, field, labels)).join(' / ');
  return formatOne(values[0], format, field, labels);
}

export interface CardModel {
  /** `type · DLC` style line; empty when no meta field has a value. */
  meta: string;
  stats: { label: string; value: string }[];
}

/** The meta line and the (at most two) stats a card shows. */
export function cardModel(
  item: Readonly<Record<string, unknown>>,
  cardStats: readonly StatSpec[],
  cardMeta: readonly string[],
  labels?: LabelMap,
): CardModel {
  const meta = cardMeta
    .map((field) => formatField(item, field, field === 'rarity' ? 'rarity' : 'label', labels))
    .filter((text): text is string => text !== undefined)
    .join(' · ');
  const stats = cardStats.flatMap((spec) => {
    const value = formatField(item, spec.field, spec.format, labels);
    return value === undefined ? [] : [{ label: spec.label, value }];
  });
  return { meta, stats };
}
