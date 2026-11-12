/**
 * The Power → Min/Max damage table on D1 weapon pages (decision D-035).
 *
 * The wiki table has three columns: `Power`, `Min damage`, `Max damage`. Each damage cell is a
 * range such as `18-19`, because in-game damage varies slightly at the same power. So one row
 * holds four numbers: the weakest hit's range and the strongest hit's range.
 *
 * `parsePowerTable` returns those ranges exactly as written. `toPowerTable` maps a row to the
 * content model's `{ power, min, max }` (§3.1): `min` = low end of "Min damage", `max` = high end
 * of "Max damage", i.e. the full damage spread at that power. Claymore power 1 (`18-19` /
 * `32-34`) becomes `{ power: 1, min: 18, max: 34 }`. A single number (`25`) is a range of one.
 */
import { stripWikiMarkup } from './templates';
import { parseWikitextTables, type WikitextTable } from './tables';

export interface DamageRange {
  low: number;
  high: number;
}

export interface PowerRow {
  power: number;
  /** The "Min …" cell as written. */
  minRange: DamageRange;
  /** The "Max …" cell as written. */
  maxRange: DamageRange;
}

export interface PowerPoint {
  power: number;
  min: number;
  max: number;
}

/** `"18-19"`, `"18–19"`, `"1,490-1,552"`, `"25"` → range; anything else → undefined. */
export function parseRange(raw: string): DamageRange | undefined {
  const text = stripWikiMarkup(raw)
    .replace(/,(?=\d{3}\b)/g, '')
    .trim();
  const match = /^(\d+(?:\.\d+)?)(?:\s*[-–—]\s*(\d+(?:\.\d+)?))?$/.exec(text);
  if (!match) return undefined;
  const low = Number(match[1]);
  const high = match[2] === undefined ? low : Number(match[2]);
  return { low: Math.min(low, high), high: Math.max(low, high) };
}

const norm = (h: string) => stripWikiMarkup(h).toLowerCase().replace(/\s+/g, ' ').trim();

/** Weapon pages tabulate damage; armor pages use the same layout for health. */
export type PowerMeasure = 'damage' | 'health';

function columns(table: WikitextTable, measure: PowerMeasure) {
  const headers = table.headers.map(norm);
  return {
    power: headers.findIndex((h) => h === 'power' || h === 'power level'),
    min: headers.findIndex((h) => h === `min ${measure}` || h === `minimum ${measure}`),
    max: headers.findIndex((h) => h === `max ${measure}` || h === `maximum ${measure}`),
  };
}

/**
 * Finds the `Power | Min {measure} | Max {measure}` table in item wikitext and returns its rows,
 * sorted by power. Returns `[]` when the page has no such table.
 */
export function parsePowerTable(
  wikitext: string,
  { measure = 'damage' }: { measure?: PowerMeasure } = {},
): PowerRow[] {
  for (const table of parseWikitextTables(wikitext)) {
    const col = columns(table, measure);
    if (col.power === -1 || col.min === -1 || col.max === -1) continue;
    const rows: PowerRow[] = [];
    for (const cells of table.rows) {
      const power = Number(stripWikiMarkup(cells[col.power] ?? ''));
      const minRange = parseRange(cells[col.min] ?? '');
      const maxRange = parseRange(cells[col.max] ?? '');
      if (!Number.isFinite(power) || !minRange || !maxRange) continue;
      rows.push({ power, minRange, maxRange });
    }
    if (rows.length) return rows.sort((a, b) => a.power - b.power);
  }
  return [];
}

/** Content-model points: `min` = Min damage low end, `max` = Max damage high end. */
export function toPowerTable(rows: readonly PowerRow[]): PowerPoint[] {
  return rows.map((r) => ({ power: r.power, min: r.minRange.low, max: r.maxRange.high }));
}
