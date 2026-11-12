/**
 * What the Compare page fetches (`/compare/{game}/{category}.json`): one entry per entity of a
 * category, holding only the values of that category's `compareRows`. The keys are short because
 * the file is downloaded by the browser.
 */
export type CompareCell = number | string | boolean | string[];

export interface CompareEntry {
  /** Slug. */
  s: string;
  /** Display name. */
  n: string;
  /** Self-hosted image path. */
  i?: string;
  /** Rarity. */
  r?: string;
  /** Row value by the row's `field`. A row the entity has no data for is absent. */
  v: Record<string, CompareCell>;
}
