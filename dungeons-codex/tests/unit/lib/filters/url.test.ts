import { describe, expect, it } from 'vitest';
import { decodeValue, encodeValue, parseState, serializeState } from '@/lib/filters/url';
import { COMBO, DAMAGE, DEFS, DLC, KIND, PROPS, TEXT, UNIQUE, WEAPON_TYPE } from './fixtures';

const params = (query: string) => new URLSearchParams(query);

describe('decodeValue', () => {
  it('reads tokens for types', () => {
    expect(decodeValue(KIND, 'melee')).toBe('melee');
    expect(decodeValue(KIND, 'Melee')).toBeUndefined();
    expect(decodeValue(KIND, 'a b')).toBeUndefined();
    expect(decodeValue(KIND, 'x'.repeat(81))).toBeUndefined();
    expect(decodeValue(KIND, '')).toBeUndefined();
  });

  it('reads comma-separated multis, dropping invalid and duplicate tokens', () => {
    expect(decodeValue(PROPS, 'dual-wield,spin-attack')).toEqual(['dual-wield', 'spin-attack']);
    expect(decodeValue(PROPS, 'a,,B,a,b-c')).toEqual(['a', 'b-c']);
    expect(decodeValue(PROPS, ',,')).toBeUndefined();
  });

  it('reads toggles as 1', () => {
    expect(decodeValue(UNIQUE, '1')).toBe(true);
    expect(decodeValue(UNIQUE, '0')).toBeUndefined();
    expect(decodeValue(UNIQUE, 'true')).toBeUndefined();
  });

  it('reads min-max ranges, including decimals', () => {
    expect(decodeValue(DAMAGE, '10-40')).toEqual([10, 40]);
    expect(decodeValue(DAMAGE, '0.5-3.25')).toEqual([0.5, 3.25]);
    expect(decodeValue(DAMAGE, '5-5')).toEqual([5, 5]);
    expect(decodeValue(DAMAGE, '40-10')).toBeUndefined();
    expect(decodeValue(DAMAGE, '10')).toBeUndefined();
    expect(decodeValue(DAMAGE, 'a-b')).toBeUndefined();
    expect(decodeValue(DAMAGE, '-5-10')).toEqual([-5, 10]);
    expect(decodeValue(DAMAGE, '-30--10')).toEqual([-30, -10]);
    expect(decodeValue(DAMAGE, '-10--30')).toBeUndefined();
    expect(decodeValue(DAMAGE, '--5-10')).toBeUndefined();
  });

  it('trims and caps the text query', () => {
    expect(decodeValue(TEXT, '  claymore ')).toBe('claymore');
    expect(decodeValue(TEXT, '   ')).toBeUndefined();
    expect(decodeValue(TEXT, 'x'.repeat(150))).toHaveLength(100);
  });
});

describe('encodeValue', () => {
  it('writes each kind and nothing for "no filter"', () => {
    expect(encodeValue(KIND, 'melee')).toBe('melee');
    expect(encodeValue(KIND, '')).toBeUndefined();
    expect(encodeValue(KIND, true)).toBeUndefined();
    expect(encodeValue(KIND, undefined)).toBeUndefined();
    expect(encodeValue(TEXT, 'sword')).toBe('sword');
    expect(encodeValue(PROPS, ['a', 'b'])).toBe('a,b');
    expect(encodeValue(PROPS, [])).toBeUndefined();
    expect(encodeValue(PROPS, 'a')).toBeUndefined();
    expect(encodeValue(UNIQUE, true)).toBe('1');
    expect(encodeValue(UNIQUE, false)).toBeUndefined();
    expect(encodeValue(DAMAGE, [10, 40])).toBe('10-40');
    expect(encodeValue(DAMAGE, [-25, 25])).toBe('-25-25');
    expect(encodeValue(DAMAGE, [0.1 + 0.2, 3])).toBe('0.3-3');
    expect(encodeValue(DAMAGE, [1] as never)).toBeUndefined();
    expect(encodeValue(DAMAGE, 'x')).toBeUndefined();
  });
});

describe('parseState', () => {
  it('reads the spec example', () => {
    const state = parseState(
      params('t=melee&wt=daggers&dmg=10-40&p=dual-wield,spin-attack&u=1&sort=dmg-desc'),
      DEFS,
    );
    expect(state).toEqual({
      t: 'melee',
      wt: 'daggers',
      dmg: [10, 40],
      p: ['dual-wield', 'spin-attack'],
      u: true,
    });
  });

  it('ignores unknown and invalid params quietly', () => {
    expect(parseState(params('x=1&dmg=nope&u=maybe&p=,,&t=A%20B'), DEFS)).toEqual({});
    expect(parseState(params(''), DEFS)).toEqual({});
  });

  it('drops filters whose showWhen fails', () => {
    expect(parseState(params('wt=daggers&cl=1-3'), [KIND, WEAPON_TYPE, COMBO])).toEqual({});
    expect(parseState(params('t=ranged&wt=bow&cl=1-3'), [KIND, WEAPON_TYPE, COMBO])).toEqual({
      t: 'ranged',
      wt: 'bow',
    });
  });

  it('accepts anything with a get method', () => {
    expect(parseState({ get: (k) => (k === 'u' ? '1' : null) }, [UNIQUE])).toEqual({ u: true });
  });
});

describe('serializeState', () => {
  it('writes shown filters in def order', () => {
    const out = serializeState(
      { u: true, t: 'melee', dmg: [10, 40], p: ['a', 'b'], wt: 'daggers' },
      DEFS,
    );
    expect(out.toString()).toBe('t=melee&wt=daggers&dmg=10-40&p=a%2Cb&u=1');
  });

  it('leaves out hidden, empty and invalid values', () => {
    expect(serializeState({ wt: 'daggers', cl: [1, 2] }, DEFS).toString()).toBe('');
    expect(
      serializeState({ p: [], u: false as never, dlc: ['base-game'] }, [
        PROPS,
        UNIQUE,
        DLC,
      ]).toString(),
    ).toBe('dlc=base-game');
  });

  it('round-trips through parseState', () => {
    const state = {
      t: 'melee',
      wt: 'daggers',
      dmg: [10, 40],
      p: ['dual-wield', 'spin-attack'],
      u: true,
      q: 'dag',
    } as const;
    expect(parseState(serializeState(state, DEFS), DEFS)).toEqual(state);
  });
});
