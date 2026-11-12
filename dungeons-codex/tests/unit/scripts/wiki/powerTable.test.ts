// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parsePowerTable, parseRange, toPowerTable } from '../../../../scripts/wiki/powerTable';
import { parseWikitables } from '../../../../scripts/wiki/tables';
import { fixture } from './fixtures';

describe('parsePowerTable (Claymore fixture)', () => {
  const rows = parsePowerTable(fixture('d1-claymore.wiki'));

  it('parses every documented point exactly as the wiki shows it', () => {
    expect(rows).toHaveLength(23);
    expect(rows[0]).toEqual({
      power: 1,
      minRange: { low: 18, high: 19 },
      maxRange: { low: 32, high: 34 },
    });
    expect(rows[1]).toEqual({
      power: 5,
      minRange: { low: 23, high: 24 },
      maxRange: { low: 40, high: 43 },
    });
    expect(rows.at(-1)).toEqual({
      power: 108,
      minRange: { low: 2065, high: 2150 },
      maxRange: { low: 3670, high: 3823 },
    });
    expect(rows.map((r) => r.power)).toEqual([
      1, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 108,
    ]);
  });

  it('agrees with the rendered HTML table cell for cell', () => {
    const html = parseWikitables(fixture('d1-claymore.html')).find(
      (t) => t.headers[0] === 'Power',
    )!;
    const fromHtml = html.rows.map((r) => r.cells.map((c) => c.text).join(' | '));
    const fromWikitext = rows.map(
      (r) =>
        `${r.power} | ${r.minRange.low}-${r.minRange.high} | ${r.maxRange.low}-${r.maxRange.high}`,
    );
    expect(fromWikitext).toEqual(fromHtml);
  });

  it('maps to { power, min: Min low end, max: Max high end }', () => {
    const points = toPowerTable(rows);
    expect(points[0]).toEqual({ power: 1, min: 18, max: 34 });
    expect(points.at(-1)).toEqual({ power: 108, min: 2065, max: 3823 });
  });
});

describe('parsePowerTable on other pages', () => {
  it('reads the Hunting Bow table (bows document a wide per-column range)', () => {
    const rows = parsePowerTable(fixture('d1-hunting-bow.wiki'));
    expect(rows[0]).toEqual({
      power: 1,
      minRange: { low: 12, high: 29 },
      maxRange: { low: 13, high: 31 },
    });
    expect(toPowerTable(rows)[0]).toEqual({ power: 1, min: 12, max: 31 });
  });

  it('returns [] for a page without one (Katana)', () => {
    expect(parsePowerTable(fixture('d1-katana.wiki'))).toEqual([]);
  });

  it('does not mistake an armor health table for damage, but reads it on request', () => {
    const armor = fixture('d1-champions-armor.wiki');
    expect(parsePowerTable(armor)).toEqual([]);
    const health = parsePowerTable(armor, { measure: 'health' });
    expect(health[0]).toEqual({
      power: 1,
      minRange: { low: 0, high: 0 },
      maxRange: { low: 3, high: 3 },
    });
  });

  it('sorts rows, skips unparseable ones and accepts long header names', () => {
    const rows = parsePowerTable(`{|
! Power level !! Minimum damage !! Maximum damage
|-
| 10 || 5–6 || 9
|-
| ? || 1 || 2
|-
| 1 || 1,490-1,552 || 2
|}`);
    expect(rows).toEqual([
      { power: 1, minRange: { low: 1490, high: 1552 }, maxRange: { low: 2, high: 2 } },
      { power: 10, minRange: { low: 5, high: 6 }, maxRange: { low: 9, high: 9 } },
    ]);
  });
});

describe('parseRange', () => {
  it('reads ranges, single values, reversed ranges and rejects text', () => {
    expect(parseRange('18-19')).toEqual({ low: 18, high: 19 });
    expect(parseRange(" '''25''' ")).toEqual({ low: 25, high: 25 });
    expect(parseRange('9 — 7')).toEqual({ low: 7, high: 9 });
    expect(parseRange('n/a')).toBeUndefined();
  });
});
