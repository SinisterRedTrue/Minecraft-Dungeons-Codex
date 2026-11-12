// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { parse } from '../../../../../scripts/parsers/d2/quests';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { fixture, fixtureRevision } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name);
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};
const rewards = (name: string) =>
  (get(name)._refs as { rewards: Record<string, unknown>[] }).rewards;

beforeAll(async () => {
  result = await parse(
    fakeContext(
      [
        {
          title: 'Dungeons II:Quest',
          revid: fixtureRevision('d2-quest-list.html'),
          html: fixture('d2-quest-list.html'),
        },
      ],
      'd2',
    ),
  );
});

describe('D2 quests parser', () => {
  it('reads 15 core and 27 side quests', () => {
    expect(result.category).toBe('quests');
    expect(result.drafts.filter((d) => d.questType === 'core')).toHaveLength(15);
    expect(result.drafts.filter((d) => d.questType === 'side')).toHaveLength(27);
    expect(result.expected.count).toBe(42);
  });

  it('numbers core quests in table order and leaves side quests unnumbered', () => {
    expect(get('Escape from Squid Coast').order).toBe(1);
    expect(get('The Silence in Little Howl').order).toBe(4);
    expect(get('The Final Souldown').order).toBe(15);
    expect(get('Part of the Pack')).not.toHaveProperty('order');
  });

  it('The Illagers from the Rift: XP, items and a random draw from a location', () => {
    expect(get('The Illagers from the Rift')).toMatchObject({
      id: 'd2:quests:the-illagers-from-the-rift',
      questType: 'core',
      dlcExclusive: false,
    });
    expect(rewards('The Illagers from the Rift')).toEqual([
      {
        when: 'always',
        xp: 1100,
        items: ['Sigil of Beeswax', 'Honey Dipper'],
        random: [
          {
            text: 'Random gear from Honeycomb Fields',
            count: 1,
            kind: 'gear',
            names: ['Honeycomb Fields'],
          },
        ],
      },
    ]);
  });

  it('The Silence in Little Howl: two locations and four reward lines', () => {
    expect((get('The Silence in Little Howl')._refs as { locations: string[] }).locations).toEqual([
      'Howling Woods',
      'Little Howl Hamlet',
    ]);
    expect(rewards('The Silence in Little Howl')[0]).toMatchObject({
      xp: 2750,
      items: ['Tasty Bone', 'Axe'],
    });
  });

  it('The Trembling Golem: first and subsequent completions', () => {
    expect(rewards('The Trembling Golem')).toEqual([
      { when: 'first', xp: 550, items: [], random: [] },
      { when: 'subsequent', xp: 500, items: [], random: [] },
    ]);
  });

  it('The Sculk Monstrosity Revived: an artifact pool and counted random gear', () => {
    const [first, subsequent] = rewards('The Sculk Monstrosity Revived') as {
      when: string;
      xp: number;
      items: string[];
      random: { text: string; count: number; kind: string; names: string[] }[];
    }[];
    expect(first).toMatchObject({
      when: 'first',
      xp: 1100,
      items: ['Phantom Wing', "Sculker's Bane"],
    });
    expect(first?.random[0]).toEqual({
      text: 'Random artifact between',
      count: 1,
      kind: 'artifact',
      names: [
        'Soul Harvester',
        'Warrior Drums',
        'Humbling Horn',
        'Echo Ocarina',
        "Turtle Master's Mandolin",
        "Fighter's Flute",
      ],
    });
    expect(first?.random[1]).toMatchObject({ count: 3, kind: 'gear', names: ["Singer's Meadow"] });
    expect(subsequent).toMatchObject({ when: 'subsequent', xp: 1000 });
  });

  it('strips the sprite file names that leak out of reward cells', () => {
    const all = result.drafts.flatMap((d) =>
      ((d._refs as { rewards: { items: string[] }[] }).rewards ?? []).flatMap((r) => r.items),
    );
    expect(all.some((item) => /File:|\.png/i.test(item))).toBe(false);
    expect(all).toContain('Tasty Bone');
  });
});
