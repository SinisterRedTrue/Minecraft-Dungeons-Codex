// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deriveGame } from '../../../../scripts/pipeline/derive';
import { linkGameD2 } from '../../../../scripts/pipeline/link-d2';
import { applyQuality } from '../../../../scripts/pipeline/quality';
import { applyD2Tags, tagsFor } from '../../../../scripts/pipeline/tags-d2';
import { emptyFindings, type Ent, type GameData } from '../../../../scripts/pipeline/types';
import keywords from '../../../../data/vocab/d2/properties.json';

const ent = (category: string, name: string, extra: Record<string, unknown> = {}): Ent => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return {
    id: `d2:${category}:${slug}`,
    slug,
    category,
    game: 'd2',
    name,
    related: [],
    ...extra,
  } as Ent;
};

function world(): GameData {
  return {
    weapons: [
      ent('weapons', 'Axe', {
        _refs: {
          sources: [
            { kind: 'quest', name: 'The Silence in Little Howl', raw: 'x (quest reward)' },
            { kind: 'location', name: 'Howling Woods', raw: 'Howling Woods' },
            { kind: 'location', name: 'Little Howl Hamlet', raw: 'Little Howl Hamlet' },
            { kind: 'location', name: 'Nowhere Land', raw: 'Nowhere Land' },
          ],
        },
      }),
    ],
    armor: [
      ent('armor', 'Mystic Circlet', { armorSet: 'Mystic Armor' }),
      ent('armor', 'Mystic Robe', { armorSet: 'Mystic Armor' }),
    ],
    artifacts: [ent('artifacts', 'Soul Harvester'), ent('artifacts', 'Warrior Drums')],
    talismans: [
      ent('talismans', 'Tasty Bone', {
        _refs: {
          sources: [
            { kind: 'quest', name: 'The Silence in Little Howl', raw: 'Reward from …' },
            { kind: 'mob', name: 'Mosstrosity', raw: 'Dropped by Mosstrosity' },
          ],
        },
      }),
    ],
    enchantments: [
      ent('enchantments', 'Piercing', {
        _refs: { sources: [{ kind: 'quest', name: 'Training', raw: 'Training (quest reward)' }] },
      }),
    ],
    quests: [
      ent('quests', 'The Silence in Little Howl', {
        _refs: {
          locations: ['Howling Woods', 'Little Howl Hamlet', 'The Deep Dark'],
          rewards: [
            {
              when: 'first',
              xp: 550,
              items: ['Tasty Bone', 'Axe', 'Mystery Item'],
              random: [
                {
                  text: 'Random gear from Howling Woods',
                  count: 1,
                  kind: 'gear',
                  names: ['Howling Woods'],
                },
                {
                  text: '2 random pieces of Mystic Armor',
                  count: 2,
                  kind: 'armor',
                  names: ['Mystic Armor'],
                },
                {
                  text: 'Random artifact between',
                  count: 1,
                  kind: 'artifact',
                  names: ['Soul Harvester', 'Warrior Drums'],
                },
              ],
            },
          ],
        },
      }),
    ],
    mobs: [
      ent('mobs', 'Zombie', { _refs: { locations: ['Howling Woods', 'Deep Dark'] } }),
      ent('mobs', 'Mosstrosity', { _refs: { locations: [] } }),
    ],
    locations: [
      ent('locations', 'Howling Woods', {
        stations: ['Little Howl Hamlet'],
        subAreas: ['The Deep Dark'],
        _refs: { mobs: ['Mosstrosity', 'Missing Mob'] },
      }),
      ent('locations', 'Brave Haven', {
        stations: [],
        subAreas: ['The Deep Dark'],
        _refs: { mobs: [] },
      }),
    ],
  };
}

function linked() {
  const data = world();
  const findings = emptyFindings();
  linkGameD2(data, findings);
  return { data, findings };
}

describe('linkGameD2', () => {
  it('resolves quest rewards, quest sources and location sources to ids', () => {
    const { data, findings } = linked();
    expect(data.weapons?.[0]?.locations).toEqual([
      'd2:quests:the-silence-in-little-howl',
      'd2:locations:howling-woods',
      'Nowhere Land',
    ]);
    expect(findings.unresolved.map((u) => u.value)).toContain('Nowhere Land');
    expect(data.talismans?.[0]?.locations).toEqual([
      'd2:quests:the-silence-in-little-howl',
      'd2:mobs:mosstrosity',
    ]);
    expect(data.enchantments?.[0]?.obtaining).toEqual(['Training (quest reward)']);
  });

  it('resolves a station to its one main location, and keeps ambiguous areas as text', () => {
    const { data } = linked();
    const quest = data.quests?.[0];
    expect(quest?.locationIds).toEqual(['d2:locations:howling-woods']);
    // "The Deep Dark" is a sub-area of two locations, so it is not a single location.
    expect(quest?.areas).toEqual(['The Deep Dark']);
  });

  it('structures rewards: items to ids, pools to ids, armor sets to their pieces', () => {
    const { data, findings } = linked();
    const [reward] = (data.quests?.[0]?.rewards ?? []) as {
      when: string;
      xp: number;
      items: string[];
      randomFrom: { text: string; count: number; from: string[] }[];
    }[];
    expect(reward).toMatchObject({ when: 'first', xp: 550 });
    expect(reward?.items).toEqual(['d2:talismans:tasty-bone', 'd2:weapons:axe', 'Mystery Item']);
    expect(reward?.randomFrom).toEqual([
      {
        text: 'Random gear from Howling Woods',
        count: 1,
        from: ['d2:locations:howling-woods'],
      },
      {
        text: '2 random pieces of Mystic Armor',
        count: 2,
        from: ['d2:armor:mystic-circlet', 'd2:armor:mystic-robe'],
      },
      {
        text: 'Random artifact between',
        count: 1,
        from: ['d2:artifacts:soul-harvester', 'd2:artifacts:warrior-drums'],
      },
    ]);
    expect(findings.unresolved.map((u) => u.value)).toContain('Mystery Item');
  });

  it('drops spawn areas that are not a single main location and lists them', () => {
    const { data, findings } = linked();
    expect(data.mobs?.[0]?.locationIds).toEqual(['d2:locations:howling-woods']);
    expect(findings.droppedRefs.map((d) => d.message)).toEqual(
      expect.arrayContaining([
        'spawn area "Deep Dark" is not a single main location',
        'mob "Missing Mob" not found',
      ]),
    );
    expect(data.locations?.[0]?.mobIds).toEqual(['d2:mobs:mosstrosity']);
  });

  it('collects unmatched names for redirect lookups', () => {
    const misses = new Set<string>();
    linkGameD2(world(), emptyFindings(), { misses });
    expect(misses.has('Mystery Item')).toBe(true);
  });
});

describe('deriveGame for d2', () => {
  it('computes itemIds, questIds and the mob ↔ location symmetry', () => {
    const { data } = linked();
    deriveGame(data, 'd2');
    const woods = data.locations?.find((l) => l.slug === 'howling-woods');
    expect(woods?.itemIds).toEqual(['d2:weapons:axe']);
    expect(woods?.questIds).toEqual(['d2:quests:the-silence-in-little-howl']);
    expect(woods?.mobIds).toEqual(['d2:mobs:mosstrosity', 'd2:mobs:zombie']);
    expect(data.mobs?.find((m) => m.slug === 'mosstrosity')?.locationIds).toEqual([
      'd2:locations:howling-woods',
    ]);
    expect(data.locations?.find((l) => l.slug === 'brave-haven')?.questIds).toEqual([]);
  });

  it('relates the pieces of an armor set through armorSet', () => {
    const { data } = linked();
    deriveGame(data, 'd2');
    expect(data.armor?.[0]?.related).toEqual(['d2:armor:mystic-robe']);
  });
});

describe('d2 tags', () => {
  const tags = (text: string) => tagsFor(text, keywords as Record<string, string[]>);

  it('matches reviewed keywords at word starts', () => {
    expect(tags('Frost attacks deal 30% more damage')).toEqual(['damage-boost', 'freeze']);
    expect(tags('Reduces ranged ammo cooldown time by 35%.')).toEqual(['ammo', 'cooldown']);
    expect(tags('Increases souls gained by 60%')).toEqual(['souls']);
    expect(tags('Poison attacks deal 20% more damage')).toEqual(['damage-boost', 'poison']);
  });

  it('does not match inside a word', () => {
    expect(tags('Cut a slice of the device')).toEqual([]);
    expect(tags('Fires 1 arrow')).toEqual(['ammo']);
  });

  it('tags each category from its own text and reports untagged ones', () => {
    const data: GameData = {
      weapons: [
        ent('weapons', 'A', { effect: 'Lightning attacks deal 25% more damage', tags: [] }),
      ],
      armor: [ent('armor', 'B', { effects: ['Take 25% less damage'], tags: [] })],
      artifacts: [ent('artifacts', 'C', { description: 'A mystery.', tags: [] })],
      talismans: [
        ent('talismans', 'D', {
          passiveBonus: 'Increases ranged damage',
          boostType: 'ranged',
          tags: [],
        }),
      ],
      quests: [ent('quests', 'E', { tags: [] })],
    };
    const untagged = applyD2Tags(data, keywords as Record<string, string[]>);
    expect(data.weapons?.[0]?.tags).toEqual(['damage-boost', 'lightning']);
    expect(data.armor?.[0]?.tags).toEqual(['defense']);
    expect(data.talismans?.[0]?.tags).toEqual(['ranged-damage']);
    expect(data.quests?.[0]?.tags).toEqual([]);
    expect(untagged).toEqual(['d2:artifacts:c']);
  });
});

describe('quality for d2', () => {
  it('uses the D2 recommended fields', () => {
    expect(applyQuality(ent('quests', 'Q', { quality: 'verified' }))).toEqual([]);
    expect(applyQuality(ent('talismans', 'T', { description: undefined }))).toEqual(['image']);
    expect(applyQuality(ent('weapons', 'W', { description: 'x' }))).toEqual(['image']);
    expect(applyQuality(ent('mobs', 'M', {}))).toEqual(['image', 'health']);
  });
});
