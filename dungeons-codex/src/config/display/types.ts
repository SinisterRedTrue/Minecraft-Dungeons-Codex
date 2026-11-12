/** How a value is written on cards, in tables and in the compare view. */
export type FieldFormat =
  | 'text'
  | 'label' // a token spelled with the label map ("hunting-bow" → "Hunting Bow")
  | 'decimal'
  | 'int'
  | 'percent'
  | 'seconds'
  | 'date'
  | 'bool'
  | 'rarity'
  | 'count'; // the length of a list

export interface StatSpec {
  label: string;
  /** Dot-path into the list item. */
  field: string;
  format: FieldFormat;
}

export interface ColumnSpec extends StatSpec {
  key: string;
  /** Prefix of the sort options (`dmg` → `dmg-asc` / `dmg-desc`); omit for a column that cannot sort. */
  sort?: string;
  /** Hidden below this breakpoint to keep the table readable on small screens. */
  showFrom?: 'sm' | 'md' | 'lg';
}

export interface CompareRow extends StatSpec {
  /** Which direction wins when values differ (Compare highlights the best). */
  better?: 'high' | 'low';
}

export interface DisplayConfig {
  /** At most two key stats on a card, in the pixel font. */
  cardStats: StatSpec[];
  /** Fields joined with " · " under the card name; `label`-formatted. */
  cardMeta: string[];
  /** Table columns after the icon + name column. */
  tableColumns: ColumnSpec[];
  /** Rows of the Compare page (Prompt 11). */
  compareRows: CompareRow[];
  /** Detail page sections in order (Prompt 08). */
  detailSections: string[];
  /** Value of a `SortOption` in this category's filter config. */
  defaultSort: string;
  /** Small lists (DLCs) show cards only: no filter panel. */
  hideFilters?: boolean;
  /** Extra view that groups the cards, e.g. D2 armor by set. */
  groupBy?: {
    param: 'grp';
    label: string;
    field: string;
    order: { field: string; rank: string[] };
  };
}
