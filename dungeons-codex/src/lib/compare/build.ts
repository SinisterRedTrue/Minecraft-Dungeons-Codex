import type { CompareRow } from '@/config/categories';
import { deriveListFields } from '@/lib/filters/derive';
import { getValues } from '@/lib/filters/path';
import { humanize } from '@/lib/filters/tokens';
import type { CompareCell, CompareEntry } from './types';

/** The fields of an entity the compare file reads (a subset of the schemas). */
export interface CompareSource {
  slug: string;
  name: string;
  game: string;
  category: string;
  rarity?: string | undefined;
  image?: { src: string } | undefined;
  [field: string]: unknown;
}

const ENTITY_ID = /^d[12]:[a-z]+:[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROMAN = ['', 'I', 'II', 'III'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** `id → display name`; an id the data does not know falls back to its slug, spelled out. */
export type NameOf = (id: string) => string | undefined;

function lineOf(value: unknown, nameOf: NameOf): string | undefined {
  if (typeof value === 'string') {
    if (!ENTITY_ID.test(value)) return value;
    return nameOf(value) ?? humanize(value.split(':')[2] ?? value);
  }
  if (isRecord(value) && typeof value.text === 'string') {
    // Enchantment levels and talisman tiers: "II: +30% damage".
    const step = typeof value.level === 'number' ? value.level : value.tier;
    return typeof step === 'number' && ROMAN[step] ? `${ROMAN[step]}: ${value.text}` : value.text;
  }
  return undefined;
}

/** The cell of one row for one entity, or `undefined` when the entity has no data for it. */
export function cellFor(
  row: CompareRow,
  source: Readonly<Record<string, unknown>>,
  nameOf: NameOf,
): CompareCell | undefined {
  const values = getValues(source, row.field);
  if (values.length === 0) return undefined;
  switch (row.format) {
    case 'count':
      return values.length;
    case 'list': {
      const lines = values.flatMap((v) => lineOf(v, nameOf) ?? []);
      return lines.length > 0 ? lines : undefined;
    }
    case 'label': {
      const tokens = values.filter((v): v is string => typeof v === 'string');
      if (tokens.length === 0) return undefined;
      return tokens.length === 1 ? (tokens[0] as string) : tokens;
    }
    default: {
      const first = values[0];
      return typeof first === 'number' || typeof first === 'string' || typeof first === 'boolean'
        ? first
        : undefined;
    }
  }
}

/** The compare file of one category: every entity, in the order given (the data is name-sorted). */
export function buildCompareEntries(
  rows: readonly CompareRow[],
  entities: readonly CompareSource[],
  nameOf: NameOf,
): CompareEntry[] {
  return entities.map((entity) => {
    const source = { ...entity, ...deriveListFields(entity.game, entity.category, entity) };
    const v: Record<string, CompareCell> = {};
    for (const row of rows) {
      const cell = cellFor(row, source, nameOf);
      if (cell !== undefined) v[row.field] = cell;
    }
    return {
      s: entity.slug,
      n: entity.name,
      ...(entity.image ? { i: entity.image.src } : {}),
      ...(entity.rarity ? { r: entity.rarity } : {}),
      v,
    };
  });
}
