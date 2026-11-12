/** Props the server hands to the Power Forge and the TierViewer (plain, serializable data). */
import type { GameId } from '@/config/games';
import type { ForgeItem } from './damage';
import type { EnchantmentTarget, Tier } from './enchantments';

export interface BuiltInRow {
  slug: string;
  name: string;
  href: string;
  image?: string;
}

export interface EffectRow {
  label: string;
  value?: number | undefined;
  unit?: string | undefined;
}

export interface ForgeProps {
  game: GameId;
  category: 'weapons' | 'armor';
  name: string;
  /** Which enchantments fit: a melee weapon, a ranged weapon or armor. */
  target: EnchantmentTarget;
  /** Number of enchantment slots the Forge offers (D1: 3, D2: 1; D-051). */
  slots: number;
  /** D1 only: the data the power math needs. */
  item?: ForgeItem;
  builtIns: BuiltInRow[];
  /** D1 weapons: the wiki's attack-speed rating. */
  speed?: number;
  /** D1 armor. */
  armor?: { damageReduction?: number; baseHealth?: number; effects: EffectRow[] };
  /** D2 gear: the item's own effect text and values (no power scaling is documented). */
  d2?: { effects: string[]; note?: string; values: EffectRow[] };
}

export interface TierProps {
  kind: 'enchantment' | 'talisman';
  name: string;
  tiers: { tier: Tier; text: string; value?: number | undefined; unit?: string | undefined }[];
  pointCost?: number[];
}
