/**
 * Enchantment point costs. `pointCost` lists the price of each tier step ([1, 2, 3] for a common
 * enchantment), so reaching tier N costs the first N steps together (D-085).
 */
import type { ForgeEnchantment, Pick, Tier } from './enchantments';

/** Points spent to reach `tier`: the sum of the steps up to it. */
export function cumulativeCost(
  pointCost: readonly number[] | undefined,
  tier: Tier,
): number | undefined {
  if (!pointCost || pointCost.length < tier) return undefined;
  return pointCost.slice(0, tier).reduce((sum, step) => sum + step, 0);
}

/** Total points of all picks; enchantments without a documented cost count as 0. */
export function pointsUsed(
  picks: readonly Pick[],
  catalog: ReadonlyMap<string, ForgeEnchantment>,
): number {
  return picks.reduce(
    (sum, pick) => sum + (cumulativeCost(catalog.get(pick.slug)?.pointCost, pick.tier) ?? 0),
    0,
  );
}
