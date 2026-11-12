/**
 * Dungeons II property tags (D-056). D2 effects are free sentences ("Frost attacks deal 30% more
 * damage"), so instead of D1's one-tag-per-string vocabulary there is a reviewed keyword list:
 * `data/vocab/d2/properties.json` = `{ "<tag>": ["keyword", …] }`. A keyword is a case-insensitive
 * regular-expression fragment that must start at a word boundary (`frost` matches "Frost" and
 * "Frostbite" but `ice` does not match "slice"). An entity gets every tag one of its texts matches.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { listOf, type Ent, type GameData } from './types';

export type TagKeywords = Record<string, string[]>;

export function loadD2TagVocab(vocabDir: string): TagKeywords {
  const file = path.join(vocabDir, 'd2', 'properties.json');
  if (!existsSync(file)) throw new Error(`missing ${file} (the reviewed D2 tag keyword list)`);
  return JSON.parse(readFileSync(file, 'utf8')) as TagKeywords;
}

/** The text of an entity that its tags are read from. */
function tagText(entity: Ent): string {
  switch (entity.category) {
    case 'weapons':
      return [entity.effect, entity.effectNote].filter(Boolean).join(' ');
    case 'armor':
      return listOf(entity.effects).join(' ');
    case 'artifacts':
    case 'enchantments':
      return String(entity.description ?? '');
    case 'talismans':
      return [entity.passiveBonus, entity.boostType].filter(Boolean).join(' ');
    default:
      return '';
  }
}

const TAGGED = ['weapons', 'armor', 'artifacts', 'enchantments', 'talismans'];

/** Tags for one text (sorted). */
export function tagsFor(text: string, keywords: TagKeywords): string[] {
  return Object.entries(keywords)
    .filter(([, list]) => list.some((keyword) => new RegExp(`\\b(?:${keyword})`, 'i').test(text)))
    .map(([tag]) => tag)
    .sort();
}

/**
 * Sets `tags` on every taggable entity. Returns the ids of entities that have a text but matched
 * no keyword (reported so the list can be reviewed).
 */
export function applyD2Tags(data: GameData, keywords: TagKeywords): string[] {
  const untagged: string[] = [];
  for (const category of TAGGED) {
    for (const entity of data[category] ?? []) {
      const text = tagText(entity);
      const tags = tagsFor(text, keywords);
      entity.tags = [...new Set([...listOf(entity.tags), ...tags])].sort();
      if (text.trim() && !tags.length) untagged.push(entity.id);
    }
  }
  return untagged;
}
