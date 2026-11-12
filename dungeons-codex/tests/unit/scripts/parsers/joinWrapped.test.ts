import { describe, expect, it } from 'vitest';
import { joinWrappedLines } from '../../../../scripts/parsers/common';

describe('joinWrappedLines', () => {
  it('joins a sentence the HTML broke across lines (Soul Healer)', () => {
    expect(
      joinWrappedLines([
        'Heals the most',
        'injured nearby, including the user, at the cost of souls.',
        '+1 Soul Gathering.',
      ]),
    ).toEqual([
      'Heals the most injured nearby, including the user, at the cost of souls.',
      '+1 Soul Gathering.',
    ]);
  });

  it('keeps separate properties apart', () => {
    const lines = [
      '+20% weapon Damage Boost Aura',
      'Health potions heal nearby allies',
      '12 second cooldown',
    ];
    expect(joinWrappedLines(lines)).toEqual(lines);
  });

  it('does not join after a finished sentence or a value', () => {
    expect(joinWrappedLines(['Ends here.', 'next thing'])).toEqual(['Ends here.', 'next thing']);
    expect(joinWrappedLines(['Heals 50%', 'and more'])).toEqual(['Heals 50%', 'and more']);
  });

  it('handles an empty list and a leading lower-case line', () => {
    expect(joinWrappedLines([])).toEqual([]);
    expect(joinWrappedLines(['lower'])).toEqual(['lower']);
  });
});
