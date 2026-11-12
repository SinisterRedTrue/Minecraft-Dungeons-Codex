import { GAMES, type CategorySlug, type GameId } from '@/config/games';
import { getSection } from '@/config/sections';

/** The eight sections of a game, in nav order, with their labels and links. */
export function sectionsOf(
  game: GameId,
): { slug: CategorySlug<GameId>; label: string; href: string }[] {
  return (GAMES[game].categories as readonly CategorySlug<GameId>[]).map((slug) => ({
    slug,
    label: getSection(game, slug)?.label ?? slug,
    href: `/${game}/${slug}`,
  }));
}
