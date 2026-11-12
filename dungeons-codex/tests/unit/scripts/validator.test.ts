// @vitest-environment node
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  compareByName,
  defaultPaths,
  loadUnresolvedReferences,
  loadVocab,
  type DataPaths,
} from '../../../scripts/lib/data-files';
import { formatIssue, validateData } from '../../../scripts/lib/validator';
import { VALID } from '../helpers/entities';

let root: string;
let paths: DataPaths;

function put(rel: string, content: unknown) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
}

const messages = () => validateData(paths).issues.map(formatIssue);

/** A small, fully consistent D1 data set. */
function goodData() {
  put('data/generated/d1/dlcs.json', [
    VALID['d1/dlcs']!('Jungle Awakens', { locationIds: ['d1:locations:dingy-jungle'] }),
  ]);
  put('data/generated/d1/locations.json', [
    VALID['d1/locations']!('Dingy Jungle', {
      mobIds: ['d1:mobs:zombie'],
      itemIds: ['d1:weapons:claymore'],
    }),
  ]);
  put('data/generated/d1/mobs.json', [
    VALID['d1/mobs']!('Zombie', {
      locationIds: ['d1:locations:dingy-jungle'],
      drops: ['d1:weapons:claymore', 'Emeralds'],
    }),
  ]);
  put('data/generated/d1/enchantments.json', [
    VALID['d1/enchantments']!('Sharpness', { builtInto: ['d1:weapons:claymore'] }),
  ]);
  put('data/generated/d1/weapons.json', [
    VALID['d1/weapons']!('Claymore', {
      dlc: 'jungle-awakens',
      builtInEnchantments: [{ enchantmentId: 'd1:enchantments:sharpness' }],
      locations: ['d1:locations:dingy-jungle', 'Gift Wrapper'],
      image: { src: '/images/d1/weapons/claymore.webp', width: 64, height: 64, alt: 'Claymore' },
    }),
  ]);
  put('public/images/d1/weapons/claymore.webp', 'img');
  put(
    'data/reports/coverage-d1.md',
    '# Coverage\n\n## Weapons\n- ok\n\n## Unresolved references\n- `Gift Wrapper` — d1:weapons:claymore\n- Emeralds — d1:mobs:zombie\n\n## Slug collisions\n- `Not Listed`\n',
  );
}

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'codex-validate-'));
  paths = defaultPaths(root);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('validateData', () => {
  it('passes an empty data directory', () => {
    expect(validateData(paths)).toEqual({ issues: [], counts: {} });
  });

  it('passes a consistent data set and counts entities', () => {
    goodData();
    const result = validateData(paths);
    expect(result.issues.map(formatIssue)).toEqual([]);
    expect(result.counts).toEqual({
      'd1/weapons.json': 1,
      'd1/enchantments.json': 1,
      'd1/dlcs.json': 1,
      'd1/mobs.json': 1,
      'd1/locations.json': 1,
    });
  });

  it('reports invalid JSON and non-array files', () => {
    put('data/generated/d1/weapons.json', '{oops');
    put('data/generated/d2/weapons.json', { a: 1 });
    const out = messages();
    expect(out[0]).toMatch(/^d1\/weapons\.json: invalid JSON/);
    expect(out[1]).toBe('d2/weapons.json: must contain a JSON array');
  });

  it('reports schema errors with entity and field', () => {
    put('data/generated/d1/weapons.json', [
      VALID['d1/weapons']!('Claymore', { kind: 'magic' }),
      { name: 'No id' },
    ]);
    const out = messages();
    expect(out).toContain(
      'd1/weapons.json › d1:weapons:claymore › kind: Invalid option: expected one of "melee"|"ranged"',
    );
    expect(out.some((m) => m.startsWith('d1/weapons.json › #1 › id:'))).toBe(true);
  });

  it('reports duplicate slugs, duplicate ids and unsorted files', () => {
    const a = VALID['d1/weapons']!('Sword');
    put('data/generated/d1/weapons.json', [VALID['d1/weapons']!('Zweihander'), a, a]);
    const out = messages();
    expect(out).toContain('d1/weapons.json › d1:weapons:sword › slug: duplicate slug "sword"');
    expect(out).toContain(
      'd1/weapons.json › d1:weapons:sword › id: duplicate id (also in d1/weapons.json)',
    );
    expect(out).toContain(
      'd1/weapons.json › d1:weapons:sword: not sorted by name ("Sword" comes after "Zweihander")',
    );
  });

  it('reports dangling id references, an unknown DLC and cross-game ids', () => {
    put('data/generated/d1/weapons.json', [
      VALID['d1/weapons']!('Claymore', {
        dlc: 'nope',
        related: ['d1:weapons:ghost'],
        baseItemId: 'd1:weapons:base',
        variantIds: ['d1:weapons:variant'],
        builtInEnchantments: [{ enchantmentId: 'd1:enchantments:none' }],
        locations: ['d2:locations:howling-woods'],
      }),
    ]);
    put('data/generated/d1/locations.json', [
      VALID['d1/locations']!('Cave', {
        mobIds: ['d1:mobs:x'],
        itemIds: ['d1:armor:y'],
        secretOf: 'd1:locations:z',
      }),
    ]);
    put('data/generated/d1/enchantments.json', [
      VALID['d1/enchantments']!('Smite', { builtInto: ['d1:weapons:q'] }),
    ]);
    put('data/generated/d1/dlcs.json', [
      VALID['d1/dlcs']!('Flames', { locationIds: ['d1:locations:w'] }),
    ]);
    const out = messages();
    for (const expected of [
      'd1/weapons.json › d1:weapons:claymore › related.0: unknown d1 id "d1:weapons:ghost"',
      'd1/weapons.json › d1:weapons:claymore › baseItemId: unknown d1 id "d1:weapons:base"',
      'd1/weapons.json › d1:weapons:claymore › variantIds.0: unknown d1 id "d1:weapons:variant"',
      'd1/weapons.json › d1:weapons:claymore › builtInEnchantments.0.enchantmentId: unknown d1 id "d1:enchantments:none"',
      'd1/weapons.json › d1:weapons:claymore › dlc: unknown DLC "nope"',
      'd1/weapons.json › d1:weapons:claymore › locations.0: unknown d1 id "d2:locations:howling-woods"',
      'd1/locations.json › d1:locations:cave › mobIds.0: unknown d1 id "d1:mobs:x"',
      'd1/locations.json › d1:locations:cave › itemIds.0: unknown d1 id "d1:armor:y"',
      'd1/locations.json › d1:locations:cave › secretOf: unknown d1 id "d1:locations:z"',
      'd1/enchantments.json › d1:enchantments:smite › builtInto.0: unknown d1 id "d1:weapons:q"',
      'd1/dlcs.json › d1:dlcs:flames › locationIds.0: unknown d1 id "d1:locations:w"',
    ]) {
      expect(out).toContain(expected);
    }
  });

  it('allows raw text only when the coverage report lists it as unresolved', () => {
    goodData();
    put('data/generated/d1/mobs.json', [
      VALID['d1/mobs']!('Zombie', { drops: ['Emeralds', 'Gold'] }),
    ]);
    put('data/generated/d2/quests.json', [
      VALID['d2/quests']!('Start', {
        rewards: [{ when: 'always', items: ['Mystery'], randomFrom: ['d2:weapons:x'] }],
      }),
    ]);
    const out = messages();
    expect(out).toEqual([
      'd1/mobs.json › d1:mobs:zombie › drops.1: raw text "Gold" is not listed under "Unresolved references" in coverage-d1.md',
      'd2/quests.json › d2:quests:start › rewards.0.items.0: raw text "Mystery" is not listed under "Unresolved references" in coverage-d2.md',
      'd2/quests.json › d2:quests:start › rewards.0.randomFrom.0: unknown d2 id "d2:weapons:x"',
    ]);
  });

  it('reports missing image files', () => {
    goodData();
    rmSync(path.join(root, 'public/images/d1/weapons/claymore.webp'));
    expect(messages()).toEqual([
      'd1/weapons.json › d1:weapons:claymore › image.src: missing image file public/images/d1/weapons/claymore.webp',
    ]);
  });

  it('checks open enums against data/vocab', () => {
    goodData();
    put('data/vocab/d1/enums.json', { weaponType: ['claymore'] });
    expect(messages()).toEqual([
      'd1/weapons.json › d1:weapons:claymore › weaponType: not in data/vocab enums.weaponType',
    ]);
  });

  it('formats issues without optional parts', () => {
    expect(formatIssue({ file: 'd1/a.json', message: 'x' })).toBe('d1/a.json: x');
  });
});

describe('data-files helpers', () => {
  it('compareByName sorts case-insensitively with stable tie-breaks', () => {
    const names = [
      { name: 'b' },
      { name: 'B' },
      { name: 'a', id: '2' },
      { name: 'a', id: '1' },
      { name: 'C' },
    ];
    expect([...names].sort(compareByName)).toEqual([
      { name: 'a', id: '1' },
      { name: 'a', id: '2' },
      { name: 'B' },
      { name: 'b' },
      { name: 'C' },
    ]);
    expect(compareByName({ name: 'x' }, { name: 'x' })).toBe(0);
  });

  it('loadVocab returns {} without a file and rejects bad shapes', () => {
    expect(loadVocab(paths.vocab, 'd1')).toEqual({});
    put('data/vocab/d1/enums.json', { weaponType: ['sword'] });
    expect(loadVocab(paths.vocab, 'd1')).toEqual({ weaponType: ['sword'] });
    put('data/vocab/d2/enums.json', ['sword']);
    expect(() => loadVocab(paths.vocab, 'd2')).toThrow(/object of string arrays/);
    put('data/vocab/d2/enums.json', { mobType: [1] });
    expect(() => loadVocab(paths.vocab, 'd2')).toThrow(/"mobType" must be an array of strings/);
  });

  it('loadUnresolvedReferences reads only the bullets of its section', () => {
    expect(loadUnresolvedReferences(paths.reports, 'd1').size).toBe(0);
    put(
      'data/reports/coverage-d1.md',
      '## Unresolved references\n- `A`\n* B — note\n-\nplain text\n### Sub\n- `C`\n## Next\n- `D`\n',
    );
    expect([...loadUnresolvedReferences(paths.reports, 'd1')]).toEqual(['A', 'B', 'C']);
  });

  it('defaultPaths points at the project folders', () => {
    expect(defaultPaths('/p')).toEqual({
      generated: path.join('/p', 'data', 'generated'),
      vocab: path.join('/p', 'data', 'vocab'),
      reports: path.join('/p', 'data', 'reports'),
      overrides: path.join('/p', 'data', 'overrides'),
      publicDir: path.join('/p', 'public'),
    });
    expect(defaultPaths().generated).toBe(path.join(process.cwd(), 'data', 'generated'));
  });
});
