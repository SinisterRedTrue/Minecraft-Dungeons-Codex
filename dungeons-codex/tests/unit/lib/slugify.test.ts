import { describe, expect, it } from 'vitest';
import { slugify } from '@/lib/utils/slugify';

describe('slugify', () => {
  it.each([
    ['Claymore', 'claymore'],
    ['Soul Knife (Unique)', 'soul-knife-unique'],
    ["Fighter's Bindings", 'fighters-bindings'],
    ['Hunter’s Promise', 'hunters-promise'],
    ['Rock & Roll', 'rock-and-roll'],
    ['Fire&Ice', 'fire-and-ice'],
    ['Éclair Café Ñandú', 'eclair-cafe-nandu'],
    ['  --Leading and trailing--  ', 'leading-and-trailing'],
    ['Multiple   spaces\tand\nbreaks', 'multiple-spaces-and-breaks'],
    ['Tier III', 'tier-iii'],
    ['', ''],
    ['!!!', ''],
  ])('%j → %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('is idempotent', () => {
    const once = slugify("Axe's Rage & Fury");
    expect(slugify(once)).toBe(once);
  });
});
