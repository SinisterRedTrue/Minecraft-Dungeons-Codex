/**
 * Build-time data for the Game Picker and hubs, assembled from the loaders. Everything here
 * is deterministic: seeds are the data's sync dates, so a rebuild without a data refresh
 * produces the same page.
 */
import 'server-only';
import { GAME_IDS, type CategorySlug, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';
import type { Entity } from '@/lib/schemas';
import { pickFeatured, pickHeroIcons, preferUniques, type ShowcaseItem } from '@/lib/showcase';
import { getAll, getByIds, getSyncDate } from './index';

function toItem(entity: Entity): ShowcaseItem | undefined {
  if (!entity.image) return undefined;
  return {
    id: entity.id,
    game: entity.game,
    category: entity.category,
    slug: entity.slug,
    name: entity.name,
    ...(entity.rarity ? { rarity: entity.rarity } : {}),
    isUnique: 'isUnique' in entity ? entity.isUnique === true : entity.rarity === 'unique',
    image: entity.image,
  };
}

function itemsOf(game: GameId, category: CategorySlug<GameId>): ShowcaseItem[] {
  return (getAll(game, category as never) as Entity[])
    .map(toItem)
    .filter((i): i is ShowcaseItem => i !== undefined);
}

/** The sync date used to seed picks for a game; empty when no data has been synced. */
function seedFor(game: GameId): string {
  return `${game}:${getSyncDate(game) ?? 'nodata'}`;
}

/** The icon for a hub tile: the configured representative entity's image (Design System §10). */
export function getTileImage(game: GameId, category: CategorySlug<GameId>) {
  const id = getSection(game, category)?.tileEntityId;
  const entity = id ? getByIds([id])[0] : undefined;
  return entity?.image;
}

/** 8 unique weapons and armor pieces, picked from the game's sync date. */
export function getFeaturedUniques(game: GameId, count = 8): ShowcaseItem[] {
  const pool = [...itemsOf(game, 'weapons'), ...itemsOf(game, 'armor')].filter((i) => i.isUnique);
  return pickFeatured(pool, count, `featured:${seedFor(game)}`);
}

/** 10–14 icons for the picker hero, uniques first, from both games. */
export function getHeroIcons(count = 12): ShowcaseItem[] {
  const byGame = { d1: [] as ShowcaseItem[], d2: [] as ShowcaseItem[] };
  for (const game of GAME_IDS) {
    byGame[game] = [
      ...itemsOf(game, 'weapons'),
      ...itemsOf(game, 'armor'),
      ...itemsOf(game, 'artifacts'),
    ];
  }
  return pickHeroIcons(byGame, count, `hero:${GAME_IDS.map(seedFor).join('|')}`);
}

const COLLAGE_CATEGORIES: Record<GameId, CategorySlug<GameId>[]> = {
  d1: ['armor', 'weapons', 'artifacts', 'weapons', 'enchantments'],
  d2: ['armor', 'weapons', 'talismans', 'weapons', 'artifacts'],
};

/** Five icons for a game card's collage: one per listed category, uniques preferred. */
export function getCollageIcons(game: GameId): ShowcaseItem[] {
  const used = new Set<string>();
  const out: ShowcaseItem[] = [];
  COLLAGE_CATEGORIES[game].forEach((category, index) => {
    const pick = preferUniques(itemsOf(game, category), `collage:${seedFor(game)}:${index}`).find(
      (i) => !used.has(i.id),
    );
    if (pick) {
      used.add(pick.id);
      out.push(pick);
    }
  });
  return out;
}
