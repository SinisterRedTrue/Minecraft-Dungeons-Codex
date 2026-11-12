// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d2/artifacts';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { fixture, fixtureRevision } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name);
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};

beforeAll(async () => {
  result = await parse(
    fakeContext(
      [
        {
          title: 'Dungeons II:Artifact',
          revid: fixtureRevision('d2-artifact-list.html'),
          html: fixture('d2-artifact-list.html'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 artifacts parser', () => {
  it('reads the artifact table (soul cost, cooldown, description)', () => {
    expect(result.category).toBe('artifacts');
    expect(result.drafts.length).toBeGreaterThanOrEqual(3);
    expect(result.expected.count).toBe(result.drafts.length);
  });

  it('Battle Banner: soul cost, cooldown, description and icon', () => {
    expect(get('Battle Banner')).toMatchObject({
      id: 'd2:artifacts:battle-banner',
      soulCost: 45,
      requiresSouls: true,
      cooldownSeconds: 10,
      description: 'Raise the banner of war and grant strength to you and all nearby allies.',
      _image: 'File:MCD2 Battle Banner gear icon.png',
    });
    expect(get('Battle Banner')).not.toHaveProperty('dlc');
    expect(get('Battle Banner')).not.toHaveProperty('artifactType');
  });

  it('Totem of Regeneration and Powershaker keep their own numbers', () => {
    expect(get('Totem of Regeneration')).toMatchObject({ soulCost: 65, cooldownSeconds: 27 });
    expect(get('Powershaker')).toMatchObject({ soulCost: 35, cooldownSeconds: 16 });
  });

  it('collects the obtainable locations as location sources', () => {
    const refs = get('Battle Banner')._refs as { sources: { kind: string; name: string }[] };
    expect(refs.sources.map((s) => `${s.kind}:${s.name}`)).toEqual([
      "location:Singer's Meadow",
      'location:Humbler Huskland',
    ]);
  });
});
