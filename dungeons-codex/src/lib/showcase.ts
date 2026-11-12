/**
 * Pure selection logic for the picker and hubs (hero icons, collages, featured uniques). The
 * server-side wrapper in `lib/data/showcase.ts` feeds it real entities; keeping the choice here
 * means it is unit-testable and, being seeded, identical on every build (Prompt 06 tasks 5-6).
 */
import { seededPick, seededShuffle } from './utils/seed';

/** What the picker and hubs need of an entity: enough to draw an icon and link to it. */
export interface ShowcaseItem {
  id: string;
  game: 'd1' | 'd2';
  category: string;
  slug: string;
  name: string;
  rarity?: string;
  isUnique: boolean;
  image: { src: string; width: number; height: number; alt: string };
}

/** Uniques first (they have the nicest icons), then the rest; each group stays seeded-random. */
export function preferUniques<T extends { isUnique: boolean }>(items: readonly T[], seed: string) {
  const shuffled = seededShuffle(items, seed);
  return [...shuffled.filter((i) => i.isUnique), ...shuffled.filter((i) => !i.isUnique)];
}

/**
 * Items for the hero's floating icons: mostly uniques, alternating between the two games so
 * neither dominates. Deterministic for a given seed.
 */
export function pickHeroIcons(
  byGame: Record<'d1' | 'd2', readonly ShowcaseItem[]>,
  count: number,
  seed: string,
): ShowcaseItem[] {
  const d1 = preferUniques(byGame.d1, `${seed}:d1`);
  const d2 = preferUniques(byGame.d2, `${seed}:d2`);
  const out: ShowcaseItem[] = [];
  for (let i = 0; out.length < count && (i < d1.length || i < d2.length); i++) {
    for (const pool of [d1, d2]) {
      const item = pool[i];
      if (item && out.length < count) out.push(item);
    }
  }
  return seededShuffle(out, `${seed}:order`);
}

/** `count` featured items from one pool, deterministic for the seed (e.g. the sync date). */
export function pickFeatured(
  pool: readonly ShowcaseItem[],
  count: number,
  seed: string,
): ShowcaseItem[] {
  return seededPick(pool, count, seed);
}
