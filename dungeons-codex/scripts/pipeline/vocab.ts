/**
 * Vocabularies (`[ Plans ]/04-DATA-PIPELINE.md` "Property tags", `03-CONTENT-MODEL.md` legend):
 * - `data/vocab/{game}/properties.json`: `{ "Dual wield": "dual-wield", … }`. The first sync
 *   generates it; afterwards an unmapped property fails the sync so new ones get reviewed.
 * - `data/vocab/{game}/enums.json`: the allowed values of the *(open)* enums, built from data.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { slugify } from '@/lib/utils/slugify';
import { listOf, type GameData } from './types';

export const PROPERTY_CATEGORIES = ['weapons', 'armor', 'artifacts'] as const;

/** Open enum fields per category (`schemaFor` checks them against `enums.json`). */
export const OPEN_ENUMS: Record<string, string[]> = {
  weapons: ['weaponType'],
  armor: ['armorGroup'],
  cosmetics: ['obtainedFrom'],
  mobs: ['mobType'],
};

/** A first-draft tag: the property with its numbers removed, as a slug. */
export function autoTag(property: string): string {
  const text = property
    .toLowerCase()
    .replace(/[+\-−–]?\s*\d+(?:[.,]\d+)?\s*%?/g, ' ')
    .replace(/\bx\b/g, ' ');
  return slugify(text) || 'other';
}

function readJson<T>(file: string): T | undefined {
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : undefined;
}

function writeSorted(file: string, value: Record<string, unknown>): void {
  const sorted = Object.fromEntries(
    Object.entries(value).sort(([a], [b]) =>
      a.toLowerCase() < b.toLowerCase() ? -1 : a < b ? -1 : 1,
    ),
  );
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

export interface PropertyVocabResult {
  /** True when the file did not exist and was generated from the data. */
  generated: boolean;
  /** Properties the existing vocab does not map (the sync fails when non-empty). */
  unmapped: string[];
  vocab: Record<string, string>;
}

/** Every distinct property string in the property-bearing categories. */
export function collectProperties(data: GameData): string[] {
  const all = new Set<string>();
  for (const category of PROPERTY_CATEGORIES) {
    for (const entity of data[category] ?? [])
      for (const p of listOf(entity.properties)) all.add(p);
  }
  return [...all].sort();
}

export function syncPropertyVocab(
  vocabDir: string,
  game: string,
  data: GameData,
): PropertyVocabResult {
  const file = path.join(vocabDir, game, 'properties.json');
  const existing = readJson<Record<string, string>>(file);
  const properties = collectProperties(data);
  if (!existing) {
    if (properties.length === 0) return { generated: false, unmapped: [], vocab: {} };
    const vocab = Object.fromEntries(properties.map((p) => [p, autoTag(p)]));
    writeSorted(file, vocab);
    return { generated: true, unmapped: [], vocab };
  }
  return {
    generated: false,
    unmapped: properties.filter((p) => !(p in existing)),
    vocab: existing,
  };
}

/** Sets `tags` on weapons, armor and artifacts from their properties (plus any parser tags). */
export function applyPropertyTags(data: GameData, vocab: Record<string, string>): void {
  for (const category of PROPERTY_CATEGORIES) {
    for (const entity of data[category] ?? []) {
      const tags = listOf(entity.properties)
        .map((p) => vocab[p])
        .filter((t): t is string => !!t && t !== 'other');
      entity.tags = [...new Set([...listOf(entity.tags), ...tags])].sort();
    }
  }
}

/** `enums.json` for the open enums, merged with any values already recorded. */
export function syncEnums(
  vocabDir: string,
  game: string,
  data: GameData,
): { enums: Record<string, string[]>; added: Record<string, string[]> } {
  const file = path.join(vocabDir, game, 'enums.json');
  const existing = readJson<Record<string, string[]>>(file) ?? {};
  const enums: Record<string, string[]> = { ...existing };
  const added: Record<string, string[]> = {};
  for (const [category, fields] of Object.entries(OPEN_ENUMS)) {
    for (const field of fields) {
      const found = new Set<string>();
      for (const entity of data[category] ?? []) {
        const value = entity[field];
        if (typeof value === 'string') found.add(value);
      }
      const known = new Set(existing[field] ?? []);
      const fresh = [...found].filter((v) => !known.has(v)).sort();
      if (fresh.length) added[field] = fresh;
      enums[field] = [...new Set([...known, ...found])].sort();
    }
  }
  writeSorted(file, enums);
  return { enums, added };
}
