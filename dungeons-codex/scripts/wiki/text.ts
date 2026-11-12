/** Text helpers: numbers out of effect text, booleans out of ✔/✖, clean display names. */

export type EffectUnit = '%' | 's' | 'flat';

export interface ParsedEffect {
  label: string;
  value: number;
  unit: EffectUnit;
}

const NUM = String.raw`[+\-−–]?\d+(?:[.,]\d+)?`;
const UNIT = String.raw`%|seconds?|secs?|s\b`;

/** `"−40"` → -40, `"2,5"` → 2.5 (Unicode minus/en dash count as minus). */
export function parseNumber(raw: string): number {
  return Number(raw.replace(/[−–]/g, '-').replace(',', '.'));
}

function toUnit(raw: string | undefined): EffectUnit {
  if (!raw) return 'flat';
  return raw === '%' ? '%' : 's';
}

const tidyLabel = (s: string) =>
  s
    .replace(/^(?:of|for|to|by)\s+/i, '')
    .replace(/[.:;,]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();

const VERB_UP = /^(?:increases?|boosts?|raises?|grants?|gives?|adds?)$/i;
const VERB_DOWN = /^(?:reduces?|decreases?|lowers?)$/i;

/** One clause → at most one effect. */
function parseClause(clause: string): ParsedEffect | undefined {
  const text = clause.trim();
  if (!text) return undefined;

  // "Increases X by 35%", "Reduces cooldown by 2 seconds"
  const verb = new RegExp(String.raw`^(\w+)\s+(.+?)\s+by\s+(${NUM})\s*(${UNIT})?`, 'i').exec(text);
  if (verb) {
    const [, word = '', subject = '', number = '', unit] = verb;
    if (VERB_UP.test(word) || VERB_DOWN.test(word)) {
      const magnitude = Math.abs(parseNumber(number));
      return {
        label: tidyLabel(subject),
        value: VERB_DOWN.test(word) ? -magnitude : magnitude,
        unit: toUnit(unit?.toLowerCase()),
      };
    }
  }

  // "+30% Movement Speed", "Take 25% less damage", "2.5 second cooldown", "35% damage reduction"
  const numFirst = new RegExp(
    String.raw`(?:^|\s)(${NUM})\s*(${UNIT})?\s+([A-Za-z][^\d]*)`,
    'i',
  ).exec(text);
  if (numFirst) {
    const [, number = '', unit, rest = ''] = numFirst;
    const before = text.slice(0, numFirst.index).trim();
    const label = tidyLabel(rest);
    if (label) {
      return {
        label:
          before && !/^(?:take|deal|deals|gain|gains)$/i.test(before)
            ? `${before} ${label}`
            : label,
        value: parseNumber(number),
        unit: toUnit(unit?.toLowerCase()),
      };
    }
  }

  // "Movement speed +30%", "Cooldown: 3s"
  const labelFirst = new RegExp(
    String.raw`^([A-Za-z][^\d+\-−–]*?)[\s:]+(${NUM})\s*(${UNIT})?\s*$`,
    'i',
  ).exec(text);
  if (labelFirst) {
    const [, label = '', number = '', unit] = labelFirst;
    return {
      label: tidyLabel(label),
      value: parseNumber(number),
      unit: toUnit(unit?.toLowerCase()),
    };
  }
  return undefined;
}

/**
 * Every labelled number in a piece of effect text. Clauses are split at new lines, `;`,
 * sentence ends, commas and "and" before a number.
 *
 * `"+30% Movement Speed"` → `[{label:'Movement Speed', value:30, unit:'%'}]`
 */
export function parseEffects(text: string): ParsedEffect[] {
  return text
    .split(/\n|;|\.\s+|,\s+|\s+and\s+(?=[+\-−–]?\d)/i)
    .map(parseClause)
    .filter((e): e is ParsedEffect => e !== undefined);
}

/** `"2.5 second cooldown"`, `"Cooldown: 3s"`, `"cooldown of 20 seconds"` → seconds. */
export function parseCooldown(text: string): number | undefined {
  const after = new RegExp(
    String.raw`(\d+(?:[.,]\d+)?)\s*(?:${UNIT})\s*(?:of\s+)?cooldown`,
    'i',
  ).exec(text);
  if (after?.[1]) return parseNumber(after[1]);
  const before = new RegExp(
    String.raw`cooldown\s*(?:of|:|is|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:${UNIT})`,
    'i',
  ).exec(text);
  if (before?.[1]) return parseNumber(before[1]);
  return undefined;
}

/** `✔` / `Yes` → true, `✖` / `No` / empty → false, anything else → undefined. */
export function toBool(text: string): boolean | undefined {
  const t = text.trim().toLowerCase();
  if (['✔', '✓', '✔️', 'yes', 'y', 'true'].includes(t)) return true;
  if (['✖', '✗', '✘', '❌', 'no', 'n', 'false', '', '-', '—'].includes(t)) return false;
  return undefined;
}

/** Display name as on the wiki: footnote markers removed and whitespace collapsed. */
export function normalizeName(text: string): string {
  return text
    .replace(/\[(?:\d+|[a-z]+ \d+|note \d+|key \d+|[a-z])\]/gi, '')
    .replace(/[\s ]+/g, ' ')
    .trim();
}
