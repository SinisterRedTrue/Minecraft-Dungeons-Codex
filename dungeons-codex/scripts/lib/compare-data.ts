/**
 * Builds the Compare data files (`scripts/index.ts` is the CLI): one JSON per comparable
 * category at `public/compare/{game}/{category}.json`, fetched by the Compare page for the
 * category being compared. Reads only the generated entity files, so it runs offline, and it is
 * part of `prebuild`, so the files can never be stale.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { getCategoryConfig } from '@/config/categories';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { buildCompareEntries, type CompareSource } from '@/lib/compare/build';
import { defaultPaths } from './data-files';

/** Fetched on demand for one category, so each file stays small. */
export const MAX_COMPARE_GZIP_BYTES = 24 * 1024;

function readEntities(generated: string, game: GameId, category: string): CompareSource[] {
  const file = path.join(generated, game, `${category}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as CompareSource[]) : [];
}

export interface CompareFileReport {
  game: GameId;
  category: string;
  entries: number;
  raw: number;
  gzip: number;
}

export function buildCompareFiles(root: string = process.cwd()): CompareFileReport[] {
  const paths = defaultPaths(root);
  const reports: CompareFileReport[] = [];
  for (const game of GAME_IDS) {
    // Ids resolve to names across the whole game (a weapon's built-in enchantment, a mob's drop).
    const names = new Map<string, string>();
    for (const category of GAMES[game].categories) {
      for (const e of readEntities(paths.generated, game, category)) {
        names.set(`${game}:${category}:${e.slug}`, e.name);
      }
    }
    const dir = path.join(paths.publicDir, 'compare', game);
    rmSync(dir, { recursive: true, force: true });
    for (const category of GAMES[game].categories) {
      const config = getCategoryConfig(game, category);
      if (!config || config.compareRows.length === 0) continue;
      const entries = buildCompareEntries(
        config.compareRows,
        readEntities(paths.generated, game, category),
        (id) => names.get(id),
      );
      const json = JSON.stringify(entries);
      const gzip = gzipSync(json).length;
      if (gzip > MAX_COMPARE_GZIP_BYTES) {
        throw new Error(
          `${game}/${category} compare data is ${gzip} bytes gzipped (limit ${MAX_COMPARE_GZIP_BYTES}).`,
        );
      }
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, `${category}.json`), json);
      reports.push({ game, category, entries: entries.length, raw: json.length, gzip });
    }
  }
  return reports;
}
