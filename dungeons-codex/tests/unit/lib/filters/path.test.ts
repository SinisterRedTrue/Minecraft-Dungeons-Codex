import { describe, expect, it } from 'vitest';
import { getNumbers, getValues, parsePath } from '@/lib/filters/path';

const item = {
  name: 'Claymore',
  stats: { damage: 11.5, speed: 1 },
  tags: ['dual-wield', 'spin-attack'],
  effects: [
    { label: 'Movement Speed', value: 30 },
    { label: 'Life Steal', value: 5 },
    { label: 'Movement Speed', value: 10 },
    { label: 'Odd' },
  ],
  builtIn: [{ id: 'd1:enchantments:gravity' }, { id: 'd1:enchantments:dynamo' }],
  nothing: null,
  list: [null, 1, undefined, 2],
};

describe('parsePath', () => {
  it('splits dotted paths and reads [key=value] filters', () => {
    expect(parsePath('a.b')).toEqual([{ key: 'a' }, { key: 'b' }]);
    expect(parsePath('effects[label=Movement Speed].value')).toEqual([
      { key: 'effects', where: { key: 'label', value: 'Movement Speed' } },
      { key: 'value' },
    ]);
  });

  it('keeps a dot inside a filter value', () => {
    expect(parsePath('xs[name=Dr. Who].id')).toEqual([
      { key: 'xs', where: { key: 'name', value: 'Dr. Who' } },
      { key: 'id' },
    ]);
  });

  it('caches parsed paths', () => {
    expect(parsePath('stats.damage')).toBe(parsePath('stats.damage'));
  });

  it.each(['', 'a..b', 'a[b]', 'a[=c]', 'a b', 'a.[x=y]'])('rejects invalid path %j', (path) => {
    expect(() => parsePath(path)).toThrow(/Invalid field path/);
  });
});

describe('getValues', () => {
  it('walks properties', () => {
    expect(getValues(item, 'name')).toEqual(['Claymore']);
    expect(getValues(item, 'stats.damage')).toEqual([11.5]);
  });

  it('flattens arrays, including arrays of objects', () => {
    expect(getValues(item, 'tags')).toEqual(['dual-wield', 'spin-attack']);
    expect(getValues(item, 'builtIn.id')).toEqual([
      'd1:enchantments:gravity',
      'd1:enchantments:dynamo',
    ]);
    expect(getValues(item, 'effects.label')).toEqual([
      'Movement Speed',
      'Life Steal',
      'Movement Speed',
      'Odd',
    ]);
  });

  it('filters elements with [key=value], matching on tokens', () => {
    expect(getValues(item, 'effects[label=Movement Speed].value')).toEqual([30, 10]);
    expect(getValues(item, 'effects[label=movement-speed].value')).toEqual([30, 10]);
    expect(getValues(item, 'effects[label=nope].value')).toEqual([]);
  });

  it('skips missing, null and undefined values and non-object nodes', () => {
    expect(getValues(item, 'missing')).toEqual([]);
    expect(getValues(item, 'nothing')).toEqual([]);
    expect(getValues(item, 'list')).toEqual([1, 2]);
    expect(getValues(item, 'name.length')).toEqual([]);
    expect(getValues(item, 'effects[label=Odd].value')).toEqual([]);
    expect(getValues(null, 'a')).toEqual([]);
  });

  it('a [key=value] filter on a primitive element yields nothing', () => {
    expect(getValues({ tags: ['a'] }, 'tags[x=a]')).toEqual([]);
  });

  it('a [key=value] filter also works on a single object', () => {
    expect(getValues({ one: { k: 'A', v: 1 } }, 'one[k=a].v')).toEqual([1]);
  });
});

describe('getNumbers', () => {
  it('keeps finite numbers only', () => {
    expect(getNumbers({ n: [1, 'x', Infinity, NaN, 2.5] }, 'n')).toEqual([1, 2.5]);
  });
});
