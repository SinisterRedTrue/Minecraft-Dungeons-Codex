/**
 * The two games and their eight sections each (`[ Plans ]/03-CONTENT-MODEL.md` §2).
 * Order here is display order (hub tiles, header links).
 */
export const GAMES = {
  d1: {
    name: 'Minecraft Dungeons',
    short: 'Dungeons',
    year: 2020,
    categories: [
      'weapons',
      'armor',
      'enchantments',
      'artifacts',
      'dlcs',
      'cosmetics',
      'mobs',
      'locations',
    ],
  },
  d2: {
    name: 'Minecraft Dungeons II',
    short: 'Dungeons II',
    year: 2026,
    categories: [
      'weapons',
      'armor',
      'enchantments',
      'artifacts',
      'talismans',
      'quests',
      'mobs',
      'locations',
    ],
  },
} as const;

export type GameId = keyof typeof GAMES;
export type CategorySlug<G extends GameId = GameId> = (typeof GAMES)[G]['categories'][number];
/** Every category slug used by either game. */
export type AnyCategorySlug = CategorySlug<GameId>;

export const GAME_IDS = Object.keys(GAMES) as GameId[];

export function isValidGame(game: string): game is GameId {
  return Object.hasOwn(GAMES, game);
}

export function isValidCategory<G extends GameId>(game: G, slug: string): slug is CategorySlug<G> {
  return (GAMES[game].categories as readonly string[]).includes(slug);
}

/** Every `{ game, category }` pair (16 in total), in display order. */
export function allGameCategories(): { game: GameId; category: AnyCategorySlug }[] {
  return GAME_IDS.flatMap((game) =>
    GAMES[game].categories.map((category) => ({ game, category: category as AnyCategorySlug })),
  );
}
