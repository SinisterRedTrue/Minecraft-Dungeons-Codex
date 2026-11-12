// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  OverrideFileError,
  applyOverrides,
  loadOverrides,
  type Override,
} from '../../../scripts/overrides';
import { D1WeaponSchema } from '@/lib/schemas';
import { VALID } from '../helpers/entities';

let dir: string;
const write = (game: string, category: string, content: string) => {
  mkdirSync(path.join(dir, game), { recursive: true });
  writeFileSync(path.join(dir, game, `${category}.json`), content);
};

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'codex-overrides-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const SOURCE = 'https://minecraft.wiki/w/Dungeons:Claymore';

describe('loadOverrides', () => {
  it('returns [] when there is no file', () => {
    expect(loadOverrides(dir, 'd1', 'weapons')).toEqual([]);
  });

  it('loads a valid file', () => {
    const data = [
      {
        slug: 'claymore',
        set: { comboLength: 3 },
        reason: 'List table missing value',
        sourceUrl: SOURCE,
      },
    ];
    write('d1', 'weapons', JSON.stringify(data));
    expect(loadOverrides(dir, 'd1', 'weapons')).toEqual(data);
  });

  it('rejects overrides without a sourceUrl, with empty sets or unknown keys', () => {
    write(
      'd1',
      'weapons',
      JSON.stringify([
        { slug: 'claymore', set: { comboLength: 3 }, reason: 'x' },
        { slug: 'katana', set: {}, reason: 'x', sourceUrl: SOURCE },
        { slug: 'Bad Slug', set: { a: 1 }, reason: 'x', sourceUrl: SOURCE, note: 1 },
      ]),
    );
    const error = (() => {
      try {
        loadOverrides(dir, 'd1', 'weapons');
      } catch (e) {
        return e as OverrideFileError;
      }
    })()!;
    expect(error).toBeInstanceOf(OverrideFileError);
    expect(error.problems).toEqual([
      '0.sourceUrl: Invalid input: expected string, received undefined',
      '1.set: must set at least one field',
      '2.slug: must be kebab-case',
      '2: Unrecognized key: "note"',
    ]);
    expect(error.message).toContain('✖ 0.sourceUrl');
  });

  it('rejects invalid JSON and a non-array root', () => {
    write('d1', 'weapons', '{');
    expect(() => loadOverrides(dir, 'd1', 'weapons')).toThrow(/invalid JSON/);
    write('d1', 'armor', '{}');
    expect(() => loadOverrides(dir, 'd1', 'armor')).toThrow(/\(root\)/);
  });
});

describe('applyOverrides', () => {
  const claymore = VALID['d1/weapons']!('Claymore', { stats: { damage: 11.5, speed: 1 } });
  const katana = VALID['d1/weapons']!('Katana');
  const override = (o: Partial<Override>): Override => ({
    slug: 'claymore',
    set: {},
    reason: 'Wiki table lists it',
    sourceUrl: SOURCE,
    ...o,
  });

  it('sets fields (including dotted paths), annotates them and does not mutate the input', () => {
    const input = [claymore, katana] as { slug: string }[];
    const snapshot = structuredClone(input);
    const { entities, unmatched } = applyOverrides(input, [
      override({ set: { comboLength: 3, 'stats.area': 6.5 } }),
      override({
        slug: 'katana',
        set: { 'stats.damage': 7.9, properties: ['Fast'] },
        reason: 'Second',
      }),
    ]);
    expect(input).toEqual(snapshot);
    expect(unmatched).toEqual([]);
    const [c, k] = entities as Record<string, unknown>[];
    expect(c!.comboLength).toBe(3);
    expect(c!.stats).toEqual({ damage: 11.5, speed: 1, area: 6.5 });
    expect(c!.overrides).toEqual([
      { field: 'comboLength', reason: 'Wiki table lists it', sourceUrl: SOURCE },
      { field: 'stats.area', reason: 'Wiki table lists it', sourceUrl: SOURCE },
    ]);
    expect(k!.stats).toEqual({ damage: 7.9 });
    expect(k!.properties).toEqual(['Fast']);
    // The result still validates against the schema.
    expect(D1WeaponSchema.safeParse(c).success).toBe(true);
  });

  it('returns overrides that match no entity', () => {
    const missing = override({ slug: 'ghost', set: { a: 1 } });
    expect(applyOverrides([claymore as { slug: string }], [missing]).unmatched).toEqual([missing]);
  });

  it('refuses to override identity fields', () => {
    expect(() =>
      applyOverrides([claymore as { slug: string }], [override({ set: { id: 'x' } })]),
    ).toThrow(/may not set "id"/);
    expect(() =>
      applyOverrides([claymore as { slug: string }], [override({ set: { 'overrides.0': 'x' } })]),
    ).toThrow(/may not set/);
  });
});
