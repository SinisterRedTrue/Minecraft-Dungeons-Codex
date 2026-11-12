/**
 * What the planner fetches: `public/planner/{game}.json`, built by `npm run data:index`
 * (`scripts/lib/planner-data.ts`, D-096). One file per game holds the **list items** of every
 * slot category (the same projection the category pages use, so the picker can reuse the Category
 * Browser's filters), the display labels those filters need, and the few gear fields the summary
 * reads that the list projection does not carry.
 */
import type { SlotCategory } from './slots';
import type { Curve, ItemCurves } from '@/lib/forge/curves';
import type { LabelMap } from '@/lib/filters/options';
import type { EffectRow } from '@/lib/forge/types';
import type { EntityListItem } from '@/lib/schemas';
import type { GameId } from '@/config/games';

/** Per-item data for the summary. Short keys: the file is downloaded by the browser. */
export interface GearExtra {
  /** D1 weapons: the documented power table as `[power, min, max]` rows. */
  pt?: [number, number, number][];
  /** D2 weapons and armor: the labelled numbers of the item's effects. */
  fx?: EffectRow[];
  /** D2 talismans: the effect text and number of tier I, II, III. */
  tr?: { text: string; value?: number; unit?: string }[];
}

/** The power curves of D1 weapons (armor health is not part of the planner's summary). */
export interface PlannerCurves {
  melee?: Curve;
  ranged?: Curve;
  byWeaponType: Record<string, Curve>;
  baseline: {
    melee?: NonNullable<ItemCurves['baseline']>;
    ranged?: NonNullable<ItemCurves['baseline']>;
  };
}

export interface PlannerFile {
  v: 1;
  game: GameId;
  items: Partial<Record<SlotCategory, EntityListItem[]>>;
  labels: Partial<Record<SlotCategory, LabelMap>>;
  extras: Partial<Record<SlotCategory, Record<string, GearExtra>>>;
  /** D1 only. */
  curves?: PlannerCurves;
}
