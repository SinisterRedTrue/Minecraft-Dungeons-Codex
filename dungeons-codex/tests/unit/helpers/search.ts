import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GAMES, type GameId } from '@/config/games';
import { buildSearchIndex, type AliasVocab } from '@/lib/search/buildIndex';
import { buildFlex, type FlexIndex } from '@/lib/search/engine';
import type { IndexableEntity, SearchEntry } from '@/lib/search/types';

const root = process.cwd();

export function readEntities(game: GameId): IndexableEntity[] {
  return GAMES[game].categories.flatMap((category) => {
    const file = path.join(root, 'data', 'generated', game, `${category}.json`);
    return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as IndexableEntity[]) : [];
  });
}

export function readAliases(): AliasVocab {
  return JSON.parse(
    readFileSync(path.join(root, 'data', 'vocab', 'aliases.json'), 'utf8'),
  ) as AliasVocab;
}

/** The real index of a game, built from the committed generated data. */
export function realEntries(game: GameId): SearchEntry[] {
  return buildSearchIndex(readEntities(game), readAliases());
}

const flexCache = new Map<GameId, FlexIndex>();
export function realFlex(game: GameId): FlexIndex {
  let flex = flexCache.get(game);
  if (!flex) {
    flex = buildFlex(realEntries(game));
    flexCache.set(game, flex);
  }
  return flex;
}
