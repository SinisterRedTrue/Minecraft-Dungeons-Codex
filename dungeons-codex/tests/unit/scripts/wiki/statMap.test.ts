// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { STAT_MAP, STAT_SCALE_MAX, mapInfoboxStats } from '../../../../scripts/wiki/statMap';
import { extractTemplate } from '../../../../scripts/wiki/templates';
import { parseWikitables } from '../../../../scripts/wiki/tables';
import * as cheerio from 'cheerio';
import { fixture } from './fixtures';

const infobox = (file: string) => extractTemplate(fixture(file), 'Infobox Dungeons item')!;

/** Label → value rows of the rendered infobox, as a reader sees them on the wiki. */
function renderedInfobox(file: string): Record<string, string> {
  const $ = cheerio.load(fixture(file));
  const out: Record<string, string> = {};
  $('.infobox tr').each((_, tr) => {
    const label = $(tr).find('th').first().text().trim();
    if (label) out[label] = $(tr).find('td').first().text().trim();
  });
  return out;
}

describe('STAT_MAP', () => {
  it('matches the template source labels', () => {
    const source = fixture('template-infobox-dungeons-item.wiki');
    const meleeAt = source.search(/\|melee\s*=\s*\n/);
    const rangedAt = source.search(/\|ranged\s*=\s*\n/);
    expect(meleeAt).toBeGreaterThan(0);
    expect(rangedAt).toBeGreaterThan(meleeAt);
    const sections = { melee: source.slice(meleeAt, rangedAt), ranged: source.slice(rangedAt) };
    for (const kind of ['melee', 'ranged'] as const) {
      for (const [param, def] of Object.entries(STAT_MAP[kind])) {
        const row = new RegExp(
          String.raw`\{\{\{${param}\|\}\}\}\s*\|\s*\{\{infobox row\|class=nowrap\|${def.label}\|`,
        );
        expect(sections[kind]).toMatch(row);
      }
    }
    // Ranged has a fourth, non-numeric "Charge" row; melee does not.
    expect(sections.ranged).toMatch(/\{\{\{stat4\|\}\}\}\s*\|\s*\{\{infobox row\|Charge\|/);
    expect(sections.melee).not.toContain('stat4');
    expect(source).toContain(`/${STAT_SCALE_MAX}*100`);
  });

  it.each([
    [
      'd1-claymore',
      { damage: 11.5, speed: 1, area: 6.5 },
      { Power: '11.5', Speed: '1', Area: '6.5' },
    ],
    [
      'd1-katana',
      { damage: 7.9, speed: 1.9, area: 7.2 },
      { Power: '7.9', Speed: '1.9', Area: '7.2' },
    ],
    [
      'd1-hunting-bow',
      { damage: 4.2, speed: 3.7, ammo: 4.1 },
      { Power: '4.2', Speed: '3.7', Ammo: '4.1' },
    ],
  ])('%s: mapped stats agree with the rendered infobox', (page, stats, rendered) => {
    expect(mapInfoboxStats(infobox(`${page}.wiki`))).toEqual({ stats });
    expect(renderedInfobox(`${page}.html`)).toMatchObject(rendered);
  });

  it('armor has no stat bars, in the wikitext or the rendered page', () => {
    expect(mapInfoboxStats(infobox('d1-champions-armor.wiki'))).toEqual({});
    const rendered = renderedInfobox('d1-champions-armor.html');
    expect(Object.keys(rendered)).not.toContain('Power');
    expect(rendered.Type).toBe('Armor');
  });
});

describe('mapInfoboxStats', () => {
  it('reads the ranged charge, skips blanks and non-numbers', () => {
    expect(
      mapInfoboxStats({ stat: 'Ranged', stat1: '5', stat2: '', stat3: 'n/a', stat4: 'slow' }),
    ).toEqual({
      stats: { damage: 5 },
      charge: 'slow',
    });
    expect(mapInfoboxStats({ stat: 'melee', stat1: '3,5', stat4: 'fast' })).toEqual({
      stats: { damage: 3.5 },
    });
    expect(mapInfoboxStats({ stat: 'ranged', stat4: 'medium' })).toEqual({});
    expect(mapInfoboxStats({ stat: 'armor', stat1: '1' })).toEqual({});
  });

  it('is unaffected by the power table (sanity check on the same page)', () => {
    expect(parseWikitables(fixture('d1-claymore.html')).length).toBeGreaterThan(0);
  });
});
