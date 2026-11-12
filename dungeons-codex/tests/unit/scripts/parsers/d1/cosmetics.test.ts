// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import {
  classifyObtain,
  discoverSubLists,
  parse,
} from '../../../../../scripts/parsers/d1/cosmetics';
import type { Draft, ParseResult } from '../../../../../scripts/parsers/types';
import { fixture } from '../../wiki/fixtures';
import { fakeContext } from '../fakeWiki';

let result: ParseResult;
const get = (name: string, type?: string): Draft => {
  const draft = result.drafts.find((d) => d.name === name && (!type || d.cosmeticType === type));
  if (!draft) throw new Error(`${name} not parsed`);
  return draft;
};

beforeAll(async () => {
  result = await parse(
    fakeContext([
      { title: 'Dungeons:Cosmetic', revid: 3835966, html: fixture('d1-cosmetic-overview.html') },
      { title: 'Dungeons:Cape', revid: 3792028, html: fixture('d1-cape-list.html') },
      { title: 'Dungeons:Emote', revid: 3733033, html: fixture('d1-emote-list.html') },
      { title: 'Dungeons:Flair', revid: 3879610, html: fixture('d1-flair-list.html') },
      { title: 'Dungeons:Hero', revid: 3787289, html: fixture('d1-hero-list.html') },
      { title: 'Dungeons:Pet (cosmetic)', revid: 3752260, html: fixture('d1-pet-list.html') },
    ]),
  );
});

describe('D1 cosmetics parser', () => {
  it('finds the five lists by following the overview page hatnotes', () => {
    expect(discoverSubLists(fixture('d1-cosmetic-overview.html'))).toEqual([
      { type: 'cape', title: 'Dungeons:Cape' },
      { type: 'emote', title: 'Dungeons:Emote' },
      { type: 'flare', title: 'Dungeons:Flair' },
      { type: 'skin', title: 'Dungeons:Hero' },
      { type: 'pet', title: 'Dungeons:Pet (cosmetic)' },
    ]);
  });

  it('Hero Cape: a cape that comes with the Hero Pass and editions', () => {
    expect(get('Hero Cape')).toMatchObject({
      id: 'd1:cosmetics:hero-cape',
      cosmeticType: 'cape',
      obtainedFrom: 'hero-pass',
      howToObtain:
        'Included in the Hero Edition, Hero Pass, Ultimate Edition, and the Ultimate DLC Bundle.',
      source: { title: 'Dungeons:Cape', revisionId: 3792028 },
    });
    expect(get('Hero Cape').description).toMatch(/^A cape fit for heroes/);
  });

  it('Dance Fever: a seasonal-adventure emote named after the season table it is in', () => {
    expect(get('Dance Fever')).toMatchObject({
      cosmeticType: 'emote',
      obtainedFrom: 'seasonal-adventure',
      season: 'Cloudy Climb',
      howToObtain: 'Free reward of the Cloudy Climb Adventure',
      _image: 'File:MCD Emote Dance Fever.png',
    });
    expect(get('Dramatic Fall').howToObtain).toBe('Reward of the Cloudy Climb Adventure Pass');
  });

  it('Flairs: the flair kind becomes a tag, and equal names stay separate entries', () => {
    expect(get('Food Parcel')).toMatchObject({
      cosmeticType: 'flare',
      season: 'Cloudy Climb',
      tags: ['healing-flair'],
    });
    const confettis = result.drafts.filter((d) => d.name === 'Confetti');
    expect(confettis.map((c) => c.tags)).toEqual([['level-up-flair'], ['mob-flair']]);
  });

  it('Parrot: a pet that belongs to a paid DLC', () => {
    expect(get('Parrot')).toMatchObject({
      cosmeticType: 'pet',
      obtainedFrom: 'dlc',
      dlc: 'jungle-awakens',
    });
  });

  it('Alex: a hero skin from a table without an obtainability column', () => {
    expect(get('Alex')).toMatchObject({ cosmeticType: 'skin', _image: 'File:MCD Alex.png' });
  });

  it('leaves out unimplemented and removed cosmetics, and lists them', () => {
    const names = result.drafts.map((d) => d.name);
    expect(names).not.toContain('Hammer Cape');
    expect(result.dropped).toContainEqual({
      name: 'Hammer Cape',
      reason: 'listed under "Unimplemented capes"',
    });
    expect(result.dropped).toContainEqual({
      name: 'Small Spider',
      reason: 'listed under "Unimplemented"',
    });
  });
});

describe('classifyObtain', () => {
  it('sorts free text into where a cosmetic comes from', () => {
    expect(classifyObtain('Included in the Jungle Awakens DLC.')).toMatchObject({
      obtainedFrom: 'dlc',
      dlc: 'jungle-awakens',
    });
    expect(classifyObtain('Rewarded by the Luminous Night Adventure Pass')).toMatchObject({
      obtainedFrom: 'seasonal-adventure',
      season: 'Luminous Night',
    });
    expect(classifyObtain('A thank you to our +10 million players.')).toMatchObject({
      obtainedFrom: 'event',
    });
    expect(classifyObtain('Bought in the store')).toMatchObject({ obtainedFrom: 'store' });
    expect(classifyObtain('Unlocked by an achievement')).toMatchObject({
      obtainedFrom: 'achievement',
    });
    expect(classifyObtain('Hero Pass owners')).toMatchObject({ obtainedFrom: 'hero-pass' });
    expect(classifyObtain('Somewhere else')).toMatchObject({ obtainedFrom: 'other' });
  });

  it('returns nothing for cosmetics that cannot be obtained', () => {
    expect(classifyObtain('Not obtainable in the game.')).toBeUndefined();
    expect(classifyObtain('')).toBeUndefined();
  });
});
