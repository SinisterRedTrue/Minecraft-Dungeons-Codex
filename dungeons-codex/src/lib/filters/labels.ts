/**
 * Build-time label resolution. Option and card labels are mostly a readable form of the value
 * ("dual-wield" → "Dual Wield"), but entity ids ("d1:locations:creeper-woods") and slugs that
 * name an entity ("hunting-bow", "flames-of-the-nether") need the entity's real name. The server
 * resolves those once and sends the result as a {@link LabelMap}.
 */
import { getValues } from './path';
import { labelForValue, type LabelMap } from './options';
import { isEntityId, toToken } from './tokens';
import type { FilterDef, Item } from './types';

/** Looks up an entity by id (`getByIds` on the server). */
export type NameLookup = (id: string) => string | undefined;

/**
 * Slug-valued fields that name an entity: the category of that entity, `'self'` meaning the list's
 * own category (a weapon type is the id of its base weapon).
 */
const SLUG_SOURCE: Readonly<Record<string, 'self' | 'dlcs'>> = {
  weaponType: 'self',
  armorGroup: 'self',
  dlc: 'dlcs',
};

export interface LabelRequest {
  game: string;
  category: string;
  items: readonly Item[];
  fields: readonly string[];
  lookup: NameLookup;
}

export function buildLabels({ game, category, items, fields, lookup }: LabelRequest): LabelMap {
  const out: Record<string, Record<string, string>> = {};
  for (const field of fields) {
    const source = SLUG_SOURCE[field];
    const labels: Record<string, string> = {};
    const seen = new Set<string>();
    for (const item of items) {
      for (const raw of getValues(item, field)) {
        const token = toToken(raw);
        if (seen.has(token)) continue;
        seen.add(token);
        let id: string | undefined;
        if (typeof raw === 'string' && isEntityId(raw)) id = raw;
        else if (source && typeof raw === 'string') {
          id = `${game}:${source === 'self' ? category : source}:${token}`;
        }
        const name = id === undefined ? undefined : lookup(id);
        // Only ship what the client could not spell on its own.
        if (name !== undefined && name !== labelForValue(field, raw)) labels[token] = name;
      }
    }
    if (Object.keys(labels).length > 0) out[field] = labels;
  }
  return out;
}

/** The fields whose values need labels: every option field of the filters, plus extra display fields. */
export function labelFields(defs: readonly FilterDef[], extra: readonly string[]): string[] {
  const fields = defs.flatMap((def) =>
    def.kind === 'type' || def.kind === 'multi' ? [def.field] : [],
  );
  return [...new Set([...fields, ...extra])];
}
