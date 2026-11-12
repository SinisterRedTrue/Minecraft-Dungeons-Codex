import { slugify } from '@/lib/utils/slugify';

const ENTITY_ID = /^d[12]:[a-z]+:([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/**
 * The URL-safe, comparison-safe form of a field value: the slug of an entity id
 * (`d1:locations:creeper-woods` → `creeper-woods`), the text of a number or boolean, or the slug
 * of any other text. Case, spaces and apostrophes never matter ("Chance to negate hits" and
 * "chance to negate hits" are one option).
 */
export function toToken(value: unknown): string {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const text = String(value);
  const id = ENTITY_ID.exec(text);
  return id?.[1] ?? slugify(text);
}

/** Entity ids look like `d1:weapons:sword`; other strings are free text. */
export function isEntityId(value: unknown): boolean {
  return typeof value === 'string' && ENTITY_ID.test(value);
}

const SMALL_WORDS = new Set(['of', 'the', 'and', 'in', 'on', 'to', 'a', 'an', 'for', 'at']);
const ACRONYMS: Readonly<Record<string, string>> = { dlc: 'DLC', xp: 'XP' };

/** `hunting-bow` → "Hunting Bow", `flames-of-the-nether` → "Flames of the Nether". */
export function humanize(token: string): string {
  return token
    .split('-')
    .filter(Boolean)
    .map((word, index) => {
      const acronym = ACRONYMS[word];
      if (acronym) return acronym;
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/** Free text from the wiki sometimes starts in lower case ("chance to negate hits"). */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
