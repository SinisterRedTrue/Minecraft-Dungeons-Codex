// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { artifactTypeOf, parse } from '../../../../../scripts/parsers/d1/artifacts';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { parseWikitables } from '../../../../../scripts/wiki/tables';
import { fixture } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name);
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};

beforeAll(async () => {
  result = await parse(
    fakeContext([
      { title: 'Dungeons:Artifact', revid: 3873242, html: fixture('d1-artifact-list.html') },
      {
        title: 'Dungeons:Corrupted Beacon',
        revid: 3881000,
        wikitext: fixture('d1-corrupted-beacon.wiki'),
      },
      { title: 'Dungeons:Updraft Tome', revid: 3881001, wikitext: fixture('d1-updraft-tome.wiki') },
    ]),
  );
});

describe('D1 artifacts parser', () => {
  it('Corrupted Beacon: a damaging artifact that needs souls', () => {
    const beacon = get('Corrupted Beacon');
    expect(beacon).toMatchObject({
      id: 'd1:artifacts:corrupted-beacon',
      artifactType: 'damaging',
      cooldownSeconds: 2.5,
      requiresSouls: true,
      rarity: 'common',
      properties: [
        'Summons a beam that does incredibly heavy damage to enemies.',
        '+1 soul gathering',
      ],
      _image: 'File:MCD Corrupted Beacon.png',
    });
    expect(beacon.description).toMatch(/immense power/);
    expect(beacon.source).toMatchObject({
      title: 'Dungeons:Corrupted Beacon',
      revisionId: 3881000,
    });
    expect((beacon._refs as { locations: string[] }).locations).toEqual(
      expect.arrayContaining(['Pumpkin Pastures', 'Cacti Canyon']),
    );
  });

  it('Fireworks Arrow: the section heading gives the type, the cooldown line the seconds', () => {
    expect(get('Fireworks Arrow')).toMatchObject({
      artifactType: 'quiver',
      cooldownSeconds: 30,
      requiresSouls: false,
      properties: ['Gives 1 fireworks arrow', 'Explodes on impact.'],
    });
  });

  it('Updraft Tome: DLC-exclusive artifacts carry the DLC name for linking', () => {
    const tome = get('Updraft Tome');
    expect(tome).toMatchObject({ artifactType: 'damaging', cooldownSeconds: 12 });
    expect((tome._refs as { dlc: string }).dlc).toBe('Howling Peaks');
  });

  it('skips the Unused table and counts from the page intro', () => {
    const names = result.drafts.map((d) => d.name);
    expect(names).not.toContain('Blightbearer');
    expect(result.expected.note).toMatch(/8 unused skipped/);
    expect(result.expected.count).toBe(46);
  });

  it('maps every section heading to an artifact type', () => {
    const types = parseWikitables(fixture('d1-artifact-list.html')).map(artifactTypeOf);
    expect(types.filter(Boolean)).toEqual(
      expect.arrayContaining(['damaging', 'status', 'quiver', 'summoning', 'agility', 'defensive']),
    );
  });
});
