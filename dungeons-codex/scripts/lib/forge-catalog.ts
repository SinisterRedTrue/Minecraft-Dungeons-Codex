/**
 * Builds the Power Forge enchantment catalogs (`scripts/index.ts` is the CLI): one compact JSON
 * per game at `public/forge/{game}.json`, fetched by the Forge when it mounts. Reads only the
 * generated enchantment files, so it runs offline, and it is part of `prebuild`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { GAME_IDS, type GameId } from '@/config/games';
import { buildCatalog, type CatalogSource } from '@/lib/forge/catalog';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import { defaultPaths } from './data-files';

/** A catalog is fetched on demand on detail pages, so it stays small. */
export const MAX_CATALOG_GZIP_BYTES = 24 * 1024;

export function readCatalog(root: string, game: GameId): ForgeEnchantment[] {
  const file = path.join(defaultPaths(root).generated, game, 'enchantments.json');
  if (!existsSync(file)) return [];
  return buildCatalog(game, JSON.parse(readFileSync(file, 'utf8')) as CatalogSource[]);
}

export function buildForgeCatalogs(
  root: string = process.cwd(),
): { game: GameId; entries: number; gzip: number }[] {
  const dir = path.join(defaultPaths(root).publicDir, 'forge');
  mkdirSync(dir, { recursive: true });
  return GAME_IDS.map((game) => {
    const catalog = readCatalog(root, game);
    const json = JSON.stringify(catalog);
    const gzip = gzipSync(json).length;
    if (gzip > MAX_CATALOG_GZIP_BYTES) {
      throw new Error(
        `${game} forge catalog is ${gzip} bytes gzipped (limit ${MAX_CATALOG_GZIP_BYTES}).`,
      );
    }
    writeFileSync(path.join(dir, `${game}.json`), json);
    return { game, entries: catalog.length, gzip };
  });
}
