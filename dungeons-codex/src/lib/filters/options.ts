/**
 * Turns an `options: 'auto'` def into concrete options, with labels. Labels for entity ids and
 * for slugs that name an entity (a weapon type, an armor group) come from the server as
 * {@link LabelMap}; everything else is derived here so the payload stays small.
 */
import { getValues } from './path';
import { humanize, isEntityId, sentenceCase, toToken } from './tokens';
import type { Item, Option, OptionDef } from './types';

/** `field → token → display name`, only for tokens the client cannot spell on its own. */
export type LabelMap = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** A readable label for one raw field value. */
export function labelForValue(field: string, raw: unknown, labels?: LabelMap): string {
  const token = toToken(raw);
  const known = labels?.[field]?.[token];
  if (known !== undefined) return known;
  if (typeof raw !== 'string' || isEntityId(raw)) return humanize(token);
  // Wiki text ("Movement Speed", "chance to negate hits") reads better as written than re-slugged.
  return /[A-Z\s]/.test(raw) ? sentenceCase(raw.trim()) : humanize(token);
}

/** The label for a token of `def`, whether the option list is explicit or automatic. */
export function labelForToken(def: OptionDef, token: string, labels?: LabelMap): string {
  if (def.options !== 'auto') {
    const explicit = def.options.find((o) => o.value === token);
    if (explicit) return explicit.label;
  }
  if (def.kind === 'multi' && def.noneOption?.value === token) return def.noneOption.label;
  return labels?.[def.field]?.[token] ?? humanize(token);
}

/**
 * The options of a type/multi def. Explicit lists are returned as written. Automatic ones list
 * every token in the data: first the def's `order`, then types by frequency or multis A–Z.
 */
export function resolveOptions(
  def: OptionDef,
  items: readonly Item[],
  labels?: LabelMap,
): Option[] {
  if (def.options !== 'auto') {
    return def.kind === 'multi' && def.noneOption ? [...def.options, def.noneOption] : def.options;
  }
  const seen = new Map<string, { label: string; count: number }>();
  for (const item of items) {
    const perItem = new Set<string>();
    for (const raw of getValues(item, def.field)) {
      const token = toToken(raw);
      if (perItem.has(token)) continue;
      perItem.add(token);
      const entry = seen.get(token);
      if (entry) entry.count += 1;
      else seen.set(token, { label: labelForValue(def.field, raw, labels), count: 1 });
    }
  }
  const rank = (token: string): number => {
    const index = def.order?.indexOf(token) ?? -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  const byFrequency = def.kind === 'type' ? 1 : 0;
  const compare = (a: [string, { label: string; count: number }], b: typeof a): number =>
    rank(a[0]) - rank(b[0]) ||
    byFrequency * (b[1].count - a[1].count) ||
    a[1].label.localeCompare(b[1].label, 'en', { numeric: true });
  const options = [...seen.entries()]
    .sort(compare)
    .map(([value, { label }]): Option => ({ value, label }));
  return def.kind === 'multi' && def.noneOption ? [...options, def.noneOption] : options;
}
