import type { GameId } from './games';

/**
 * The categories Compare does not work for. Kept apart from `categories.ts` (the display configs)
 * so the ⇄ buttons on every card and detail page do not pull those configs into the client;
 * `tests/unit/lib/compare/data.test.ts` checks that this list matches the categories that have
 * no `compareRows`.
 */
const NOT_COMPARABLE: ReadonlySet<string> = new Set(['d1:dlcs']);

/** Compare works for every category except the Dungeons DLCs (`[ Plans ]/07-FEATURES-SPEC.md` §3). */
export function isComparable(game: GameId, category: string): boolean {
  return !NOT_COMPARABLE.has(`${game}:${category}`);
}
