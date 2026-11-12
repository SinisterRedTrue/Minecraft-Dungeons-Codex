/** Locations and readers for the files under `data/` shared by sync, validate and coverage. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { GameId } from '@/config/games';
import type { Vocab } from '@/lib/schemas';

export interface DataPaths {
  /** `data/generated` */
  generated: string;
  /** `data/vocab` */
  vocab: string;
  /** `data/reports` */
  reports: string;
  /** `data/overrides` */
  overrides: string;
  /** `public` (image `src` values are relative to it) */
  publicDir: string;
}

export function defaultPaths(root: string = process.cwd()): DataPaths {
  return {
    generated: path.join(root, 'data', 'generated'),
    vocab: path.join(root, 'data', 'vocab'),
    reports: path.join(root, 'data', 'reports'),
    overrides: path.join(root, 'data', 'overrides'),
    publicDir: path.join(root, 'public'),
  };
}

/**
 * Generated JSON is sorted by name, case-insensitively, then by exact name and id so the
 * order is total and stable across platforms (`[ Plans ]/03-CONTENT-MODEL.md` §5).
 */
export function compareByName(
  a: { name: string; id?: string },
  b: { name: string; id?: string },
): number {
  const x = a.name.toLowerCase();
  const y = b.name.toLowerCase();
  if (x !== y) return x < y ? -1 : 1;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  const i = a.id ?? '';
  const j = b.id ?? '';
  return i < j ? -1 : i > j ? 1 : 0;
}

/**
 * `data/vocab/{game}/enums.json`: `{ "weaponType": ["sword", …], … }` restricting the
 * *(open)* enums. A missing file means "allow any string".
 */
export function loadVocab(vocabDir: string, game: GameId): Vocab {
  const file = path.join(vocabDir, game, 'enums.json');
  if (!existsSync(file)) return {};
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${file} must be an object of string arrays`);
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
      throw new Error(`${file}: "${key}" must be an array of strings`);
    }
  }
  return parsed as Vocab;
}

/**
 * Raw-text references the coverage report accepts: the bullets under its
 * "Unresolved references" heading (`- \`Some Place\` …`; the backticked part is the value).
 */
export function loadUnresolvedReferences(reportsDir: string, game: GameId): Set<string> {
  const file = path.join(reportsDir, `coverage-${game}.md`);
  const out = new Set<string>();
  if (!existsSync(file)) return out;
  let inSection = false;
  let level = 0;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const heading = /^(#+)\s+(.*)$/.exec(line);
    if (heading) {
      const [, hashes = '', title = ''] = heading;
      const depth = hashes.length;
      if (/unresolved references/i.test(title)) {
        inSection = true;
        level = depth;
      } else if (inSection && depth <= level) {
        inSection = false;
      }
      continue;
    }
    if (!inSection) continue;
    const item = /^\s*[-*]\s+(.*)$/.exec(line)?.[1];
    if (!item) continue;
    const ticked = /`([^`]+)`/.exec(item)?.[1];
    const value = (ticked ?? item.split(' — ')[0] ?? '').trim();
    if (value) out.add(value);
  }
  return out;
}
