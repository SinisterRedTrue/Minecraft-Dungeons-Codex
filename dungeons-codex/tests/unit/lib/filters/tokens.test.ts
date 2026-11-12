import { describe, expect, it } from 'vitest';
import { humanize, isEntityId, sentenceCase, toToken } from '@/lib/filters/tokens';

describe('toToken', () => {
  it('turns entity ids into their slug', () => {
    expect(toToken('d1:locations:creeper-woods')).toBe('creeper-woods');
    expect(toToken('d2:quests:a-dip-in-ichor-springs')).toBe('a-dip-in-ichor-springs');
  });

  it('slugs free text and ignores case and apostrophes', () => {
    expect(toToken('Movement Speed')).toBe('movement-speed');
    expect(toToken('chance to negate hits')).toBe(toToken('Chance to negate hits'));
    expect(toToken("Enchanter's Tome")).toBe('enchanters-tome');
  });

  it('keeps numbers and booleans as written', () => {
    expect(toToken(2.5)).toBe('2.5');
    expect(toToken(true)).toBe('true');
    expect(toToken(false)).toBe('false');
  });

  it('does not treat odd ids as ids', () => {
    expect(toToken('d3:weapons:x')).toBe('d3-weapons-x');
  });
});

describe('isEntityId', () => {
  it('recognises ids only', () => {
    expect(isEntityId('d1:weapons:sword')).toBe(true);
    expect(isEntityId('sword')).toBe(false);
    expect(isEntityId(5)).toBe(false);
  });
});

describe('humanize', () => {
  it('title-cases slugs, keeps small words and acronyms', () => {
    expect(humanize('hunting-bow')).toBe('Hunting Bow');
    expect(humanize('flames-of-the-nether')).toBe('Flames of the Nether');
    expect(humanize('the-rift')).toBe('The Rift');
    expect(humanize('dlc-mission')).toBe('DLC Mission');
    expect(humanize('xp')).toBe('XP');
    expect(humanize('')).toBe('');
  });
});

describe('sentenceCase', () => {
  it('upper-cases the first letter only', () => {
    expect(sentenceCase('chance to negate hits')).toBe('Chance to negate hits');
    expect(sentenceCase('')).toBe('');
  });
});
