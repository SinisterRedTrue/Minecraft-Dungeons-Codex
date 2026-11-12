/**
 * Enchantment effects on the Forge's damage number (`[ Plans ]/07-FEATURES-SPEC.md` §2).
 *
 * Only an enchantment whose tier text is a bare "+N% damage" and whose description names no
 * condition is folded into the main number. Everything else that mentions damage (Smiting vs.
 * the Undead, Committed vs. wounded mobs, Supercharge on charged shots …) is listed as a
 * conditional line, and effects with no damage percentage show their tier text.
 */
import type { Range } from './interpolate';

export type EnchantmentTarget = 'melee' | 'ranged' | 'armor';
export type EnchantmentKind = 'damage' | 'conditional' | 'effect';
export type Tier = 1 | 2 | 3;

export interface ForgeLevel {
  text: string;
  value?: number | undefined;
  unit?: string | undefined;
}

/** One enchantment as the Forge sees it (built into `public/forge/{game}.json`). */
export interface ForgeEnchantment {
  id: string;
  slug: string;
  name: string;
  appliesTo: EnchantmentTarget[];
  kind: EnchantmentKind;
  /** Tier I, II, III. */
  levels: ForgeLevel[];
  /** Points per tier (D1 only). */
  pointCost?: [number, number, number] | undefined;
  /** `/images/{game}/enchantments/{slug}.webp`, when the wiki has an icon. */
  image?: string | undefined;
}

export interface Pick {
  slug: string;
  tier: Tier;
}

export interface EnchantmentLine {
  slug: string;
  name: string;
  tier: Tier;
  text: string;
  value?: number | undefined;
  unit?: string | undefined;
  /** Depends on a situation (or is not a damage percentage), so it never changes the main number. */
  conditional: boolean;
  /** Folded into the main number. */
  applied: boolean;
}

/** Words that make an effect situational. */
const CONDITION_WORDS =
  /\b(undead|illagers?|when|while|chance|below|after|against|charged|wounded|enchanted|distant|full health|per shot|per second|every|only|if)\b/i;

/** "+10% damage" and nothing else. "+25% increased damage" stays conditional on purpose. */
const PLAIN_DAMAGE = /^\+\d+(?:\.\d+)?% damage$/i;

export function classifyEnchantment(
  levels: readonly ForgeLevel[],
  description: string | undefined,
): EnchantmentKind {
  // The tier text is the effect itself; a description that merely mentions damage ("Rush:
  // speed after taking damage") does not make the effect a damage effect.
  if (!levels.some((l) => /damage/i.test(l.text))) return 'effect';
  const plain = levels.every(
    (l) => l.unit === '%' && l.value !== undefined && l.value > 0 && PLAIN_DAMAGE.test(l.text),
  );
  const conditional =
    CONDITION_WORDS.test(description ?? '') || levels.some((l) => CONDITION_WORDS.test(l.text));
  return plain && !conditional ? 'damage' : 'conditional';
}

export interface Applied extends Range {
  /** Product of all folded damage factors (1 = unchanged). */
  multiplier: number;
  lines: EnchantmentLine[];
}

/**
 * Applies the picks to a base damage range. Picks whose slug is not in the catalog are skipped.
 * Only `damage` enchantments change the numbers, multiplicatively.
 */
export function applyEnchantments(
  base: Range,
  picks: readonly Pick[],
  catalog: ReadonlyMap<string, ForgeEnchantment>,
): Applied {
  let multiplier = 1;
  const lines: EnchantmentLine[] = [];
  for (const pick of picks) {
    const enchantment = catalog.get(pick.slug);
    if (!enchantment) continue;
    const level = enchantment.levels[pick.tier - 1];
    if (!level) continue;
    const { value } = level;
    const applied = enchantment.kind === 'damage' && value !== undefined;
    if (applied) multiplier *= 1 + value / 100;
    lines.push({
      slug: enchantment.slug,
      name: enchantment.name,
      tier: pick.tier,
      text: level.text,
      value,
      unit: level.unit,
      conditional: enchantment.kind === 'conditional',
      applied,
    });
  }
  return { min: base.min * multiplier, max: base.max * multiplier, multiplier, lines };
}

/** The enchantments that can go on an item of this kind, by name. */
export function enchantmentsFor(
  catalog: readonly ForgeEnchantment[],
  target: EnchantmentTarget,
): ForgeEnchantment[] {
  return catalog
    .filter((e) => e.appliesTo.includes(target))
    .sort((a, b) => a.name.localeCompare(b.name));
}
