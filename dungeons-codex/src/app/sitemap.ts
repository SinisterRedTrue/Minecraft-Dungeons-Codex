import type { MetadataRoute } from 'next';
import { GAME_IDS, type GameId } from '@/config/games';
import { getSyncDate } from '@/lib/data';
import { buildSitemap } from '@/lib/seo';

/** Every static URL; detail pages are added from the loaders in Prompt 08. */
export default function sitemap(): MetadataRoute.Sitemap {
  const syncDates: Partial<Record<GameId, string>> = {};
  for (const game of GAME_IDS) {
    const date = getSyncDate(game);
    if (date) syncDates[game] = date;
  }
  return buildSitemap(syncDates);
}
