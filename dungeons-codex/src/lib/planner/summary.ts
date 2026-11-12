/**
 * The planner's live summary (`[ Plans ]/07-FEATURES-SPEC.md` §5): total enchantment points,
 * the combined effect list (the same label and unit are simply added up; in-game stacking may
 * differ), the damage per hit of the chosen weapons at the build's power (through the Forge
 * math, Approximate rules included) and the warnings (the same artifact twice).
 */
import { damageAt, type Value } from '@/lib/forge/damage';
import { applyEnchantments, type ForgeEnchantment } from '@/lib/forge/enchantments';
import { pointsUsed } from '@/lib/forge/points';
import type { EffectRow } from '@/lib/forge/types';
import type { PlannerData } from './data';
import type { Build } from './schema';
import { slotsFor, type SlotDef } from './slots';

/** Power of a D1 build that names none. */
export const DEFAULT_POWER = 100;

export interface GroupedEffect {
  label: string;
  unit?: string | undefined;
  /** The sum. */
  value: number;
  /** Names of the items and enchantments it came from. */
  sources: string[];
}

export interface DamageLine {
  slotKey: string;
  label: string;
  name: string;
  /** `undefined`: nothing documented to calculate it from. */
  value?: Value;
  /** After the enchantments that always apply (Sharpness, Power). */
  min?: number;
  max?: number;
  multiplier?: number;
}

export interface Warning {
  kind: 'duplicate-artifact';
  slug: string;
  name: string;
  slots: string[];
}

export interface Summary {
  /** Items in the build. */
  filled: number;
  /** Enchantment points spent (Dungeons only; Dungeons II enchantments have no cost). */
  points: number;
  power: number;
  damage: DamageLine[];
  effects: GroupedEffect[];
  /** Effects that have no number to add up, as written. */
  notes: string[];
  warnings: Warning[];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "+30%", "-25%", "+5s", "+2": the sign always shows. */
export function formatEffectValue(value: number, unit?: string): string {
  const sign = value < 0 ? '-' : '+';
  const amount = Math.abs(Math.round(value * 100) / 100);
  return unit === '%' || unit === 's' ? `${sign}${amount}${unit}` : `${sign}${amount}`;
}

const PERCENT_TEXT = /^[+-]?\d+(?:\.\d+)?\s*%\s+(.+)$/;
const PLAIN_PERCENT = /^\d+(?:\.\d+)?%$/;
/** The verb of a talisman bonus: "Increases ranged damage" raises, "Decreases roll cooldown" lowers. */
const RAISES = /^(?:increases?|boosts?|improves?|raises?)\s+/i;
const LOWERS = /^(?:decreases?|reduces?|lowers?)\s+/i;

class Effects {
  private readonly groups = new Map<string, GroupedEffect>();
  readonly notes: string[] = [];

  add(label: string, value: number, unit: string | undefined, source: string) {
    const key = `${label.toLowerCase()}|${unit ?? ''}`;
    const group = this.groups.get(key);
    if (!group) {
      this.groups.set(key, { label, unit, value, sources: [source] });
      return;
    }
    group.value += value;
    if (!group.sources.includes(source)) group.sources.push(source);
  }

  /** A labelled number: summed when it has a value, a note otherwise. */
  addRow(row: EffectRow, source: string) {
    if (row.value === undefined) this.notes.push(`${source}: ${row.label}`);
    else this.add(row.label, row.value, row.unit, source);
  }

  list(): GroupedEffect[] {
    return [...this.groups.values()]
      .map((g) => ({ ...g, value: Math.round(g.value * 100) / 100 }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }
}

/** One enchantment tier as an effect: "+10% damage" adds to "Damage", anything else is a note. */
function addEnchantment(effects: Effects, enchantment: ForgeEnchantment, tier: 1 | 2 | 3) {
  const level = enchantment.levels[tier - 1];
  if (!level) return;
  const match =
    level.unit === '%' && level.value !== undefined ? PERCENT_TEXT.exec(level.text) : null;
  if (match)
    effects.add(capitalize(match[1] as string), level.value as number, '%', enchantment.name);
  else effects.notes.push(`${enchantment.name}: ${level.text}`);
}

export function summarize(
  build: Build,
  data: PlannerData,
  catalog: ReadonlyMap<string, ForgeEnchantment>,
): Summary {
  const effects = new Effects();
  const damage: DamageLine[] = [];
  const picksOf: Build['slots'][string]['picks'] = [];
  const artifacts = new Map<string, { name: string; slots: string[] }>();
  const power = build.power ?? DEFAULT_POWER;
  let filled = 0;

  for (const slot of slotsFor(build.game)) {
    const choice = build.slots[slot.key];
    const item = choice && data.item(slot.category, choice.slug);
    if (!choice || !item) continue;
    filled += 1;
    picksOf.push(...choice.picks);

    const extra = data.extra(slot.category, choice.slug);
    for (const row of extra?.fx ?? []) effects.addRow(row, item.name);
    for (const row of (item.effects as (EffectRow | string)[] | undefined) ?? []) {
      if (typeof row === 'object') effects.addRow(row, item.name);
    }
    for (const pick of choice.picks) {
      const enchantment = catalog.get(pick.slug);
      if (enchantment) addEnchantment(effects, enchantment, pick.tier);
    }
    if (slot.tiered)
      addTalisman(effects, item.name, String(item.passiveBonus ?? ''), extra?.tr, choice.tier);
    if (slot.category === 'artifacts') {
      const seen = artifacts.get(item.slug) ?? { name: item.name, slots: [] };
      seen.slots.push(slot.label);
      artifacts.set(item.slug, seen);
    }
    if (build.game === 'd1' && slot.target && slot.category === 'weapons') {
      damage.push(damageLine(slot, item.name, data, choice, power, catalog));
    }
  }

  return {
    filled,
    points: pointsUsed(picksOf, catalog),
    power,
    damage,
    effects: effects.list(),
    notes: effects.notes,
    warnings: [...artifacts]
      .filter(([, entry]) => entry.slots.length > 1)
      .map(([slug, entry]) => ({ kind: 'duplicate-artifact' as const, slug, ...entry })),
  };
}

/**
 * A talisman's tier as an effect. Only a plain percentage with a recognised verb is added up
 * ("Increases ranged damage" +25 % → "+25% Ranged damage", "Decreases roll cooldown" 20 % →
 * "-20% Roll cooldown"); conditions ("10% while health is above 95%"), summons and anything else
 * are kept as a note in the wiki's words.
 */
function addTalisman(
  effects: Effects,
  name: string,
  bonus: string,
  tiers: { text: string; value?: number; unit?: string }[] | undefined,
  tier: 1 | 2 | 3 | undefined,
) {
  const row = tiers?.[(tier ?? 1) - 1];
  if (!row) return;
  if (row.value !== undefined && row.unit === '%' && PLAIN_PERCENT.test(row.text)) {
    if (RAISES.test(bonus))
      return effects.add(capitalize(bonus.replace(RAISES, '')), row.value, '%', name);
    if (LOWERS.test(bonus))
      return effects.add(capitalize(bonus.replace(LOWERS, '')), -row.value, '%', name);
  }
  effects.notes.push(row.text === 'N/A' ? `${name}: ${bonus}` : `${name}: ${bonus} (${row.text})`);
}

function damageLine(
  slot: SlotDef,
  name: string,
  data: PlannerData,
  choice: Build['slots'][string],
  power: number,
  catalog: ReadonlyMap<string, ForgeEnchantment>,
): DamageLine {
  const base = { slotKey: slot.key, label: slot.label, name };
  const item = data.forgeItem(choice.slug);
  const value = item && damageAt(item, power);
  if (!value) return base;
  const applied = applyEnchantments(value, choice.picks, catalog);
  return { ...base, value, min: applied.min, max: applied.max, multiplier: applied.multiplier };
}
