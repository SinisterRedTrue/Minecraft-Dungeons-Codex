/** Builds the Codex Search index files (`scripts/index.ts` is the CLI). Reads only generated JSON. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { GAMES, GAME_IDS, type GameId } from '@/config/games';
import { buildSearchIndex, unknownAliasKeys, type AliasVocab } from '@/lib/search/buildIndex';
import type { IndexableEntity } from '@/lib/search/types';
import { defaultPaths } from './data-files';

/** Plans §07 §1: the index of one game stays under this when gzipped. */
export const MAX_GZIP_BYTES = 60 * 1024;

function readEntities(generated: string, game: GameId): IndexableEntity[] {
  const entities: IndexableEntity[] = [];
  for (const category of GAMES[game].categories) {
    const file = path.join(generated, game, `${category}.json`);
    if (!existsSync(file)) continue;
    entities.push(...(JSON.parse(readFileSync(file, 'utf8')) as IndexableEntity[]));
  }
  return entities;
}

function readAliases(vocab: string): AliasVocab {
  const file = path.join(vocab, 'aliases.json');
  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as AliasVocab) : {};
}

export function buildAll(
  root: string = process.cwd(),
): { game: GameId; entries: number; gzip: number }[] {
  const paths = defaultPaths(root);
  const aliases = readAliases(paths.vocab);
  const byGame = GAME_IDS.map((game) => ({ game, entities: readEntities(paths.generated, game) }));

  const unknown = unknownAliasKeys(
    byGame.flatMap((g) => g.entities),
    aliases,
  );
  if (unknown.length > 0) {
    throw new Error(`data/vocab/aliases.json names no entity: ${unknown.join(', ')}`);
  }

  const searchDir = path.join(paths.publicDir, 'search');
  mkdirSync(searchDir, { recursive: true });
  return byGame.map(({ game, entities }) => {
    const json = JSON.stringify(buildSearchIndex(entities, aliases));
    const gzip = gzipSync(json).length;
    if (gzip > MAX_GZIP_BYTES) {
      throw new Error(`${game} search index is ${gzip} bytes gzipped (limit ${MAX_GZIP_BYTES}).`);
    }
    mkdirSync(path.join(paths.generated, game), { recursive: true });
    writeFileSync(path.join(paths.generated, game, 'search-index.json'), json);
    writeFileSync(path.join(searchDir, `${game}.json`), json);
    return { game, entries: entities.length, gzip };
  });
}
