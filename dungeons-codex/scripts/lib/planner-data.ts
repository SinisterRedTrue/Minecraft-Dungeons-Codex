/**
 * Builds the Build Planner data files (`scripts/index.ts` is the CLI): one JSON per game at
 * `public/planner/{game}.json`, fetched when the planner mounts (D-096). Reads only the generated
 * entity files and the Forge curves, so it runs offline, and it is part of `prebuild`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { buildPlannerFile } from '@/lib/planner/prepare';
import { plannerCategories, type SlotCategory } from '@/lib/planner/slots';
import type { PlannerCurves } from '@/lib/planner/types';
import type { Entity } from '@/lib/schemas';
import { defaultPaths } from './data-files';

/** One file per game, fetched only on the planner page. */
export const MAX_PLANNER_GZIP_BYTES = 80 * 1024;

function readEntities(generated: string, game: GameId, category: string): Entity[] {
  const file = path.join(generated, game, `${category}.json`);
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Entity[]) : [];
}

export interface PlannerFileReport {
  game: GameId;
  items: number;
  raw: number;
  gzip: number;
}

export function buildPlannerFiles(root: string = process.cwd()): PlannerFileReport[] {
  const paths = defaultPaths(root);
  const dir = path.join(paths.publicDir, 'planner');
  mkdirSync(dir, { recursive: true });
  return GAME_IDS.map((game) => {
    // Ids resolve to names across the whole game (a weapon's built-in enchantment, a location).
    const names = new Map<string, string>();
    for (const category of GAMES[game].categories) {
      for (const e of readEntities(paths.generated, game, category)) names.set(e.id, e.name);
    }
    const entities: Partial<Record<SlotCategory, Entity[]>> = {};
    for (const category of plannerCategories(game)) {
      entities[category] = readEntities(paths.generated, game, category);
    }
    const curvesFile = path.join(root, 'data', 'forge', game, 'curves.json');
    const curves = existsSync(curvesFile)
      ? (JSON.parse(readFileSync(curvesFile, 'utf8')) as { weapons?: PlannerCurves })
      : undefined;
    const file = buildPlannerFile(
      game,
      entities,
      (id) => names.get(id),
      curves?.weapons ? { weapons: curves.weapons } : undefined,
    );
    const json = JSON.stringify(file);
    const gzip = gzipSync(json).length;
    if (gzip > MAX_PLANNER_GZIP_BYTES) {
      throw new Error(
        `${game} planner data is ${gzip} bytes gzipped (limit ${MAX_PLANNER_GZIP_BYTES}).`,
      );
    }
    writeFileSync(path.join(dir, `${game}.json`), json);
    return {
      game,
      items: Object.values(file.items).reduce((sum, list) => sum + list.length, 0),
      raw: json.length,
      gzip,
    };
  });
}
