import type { MetadataRoute } from 'next';
import { GAME_IDS, allGameCategories, type GameId } from '@/config/games';
import { getAll, getSyncDate } from '@/lib/data';
import type { Entity } from '@/lib/schemas';
import { buildSitemap } from '@/lib/seo';

/** Every static URL plus one per entity, read from the same loaders the pages are generated from. */
export default function sitemap(): MetadataRoute.Sitemap {
  const syncDates: Partial<Record<GameId, string>> = {};
  for (const game of GAME_IDS) {
    const date = getSyncDate(game);
    if (date) syncDates[game] = date;
  }
  const details = allGameCategories().flatMap(({ game, category }) =>
    (getAll(game, category as never) as unknown as Entity[]).map((entity) => ({
      game,
      category,
      slug: entity.slug,
    })),
  );
  return buildSitemap(syncDates, undefined, details);
}
