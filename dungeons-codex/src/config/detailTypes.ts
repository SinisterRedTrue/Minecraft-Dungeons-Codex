/** Shapes of the detail page config (). */
import type { FieldFormat } from './display/types';
import type { CategorySlug, GameId } from './games';

/** How an infobox value is written. `ref*` link to an entity when one can be found. */
type InfoFormat =
  | FieldFormat
  /** One entity id, or a slug naming an entity of `refKind` (`dlc`, `weaponType`). */
  | 'ref'
  /** Every entity id / text of a list. */
  | 'refs'
  /** Plain values joined with " / " (point costs). */
  | 'join'
  /** The number of values, written "3 locations". */
  | 'size';

export interface InfoRowSpec {
  label: string;
  field: string;
  format: InfoFormat;
  /** Where a bare slug points: a D1 DLC page, or an entity of the page's own category. */
  refKind?: 'dlcs' | 'self';
  /** Word for `size` rows, singular / plural. */
  noun?: [string, string];
}

export interface StatRowSpec {
  label: string;
  /** Dot path into the entity plus its derived fields (`lib/filters/derive.ts`). */
  field: string;
  unit?: string;
}

export interface ChipSpec {
  field: string;
  refKind?: 'dlcs' | 'self';
}

export type PerCategory<T> = { [G in GameId]: { [C in CategorySlug<G>]: T } };
