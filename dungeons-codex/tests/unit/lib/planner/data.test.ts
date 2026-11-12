// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getFilterConfig } from '@/config/filters';
import { GAME_IDS } from '@/config/games';
import {
  indexPlanner,
  loadPlanner,
  plannerFileUrl,
  resetPlannerCache,
  scopeDefs,
  scopeItems,
} from '@/lib/planner/data';
import { buildPlannerFile } from '@/lib/planner/prepare';
import { getSlot, plannerCategories } from '@/lib/planner/slots';
import type { PlannerFile } from '@/lib/planner/types';
import { MAX_PLANNER_GZIP_BYTES } from '../../../../scripts/lib/planner-data';
import { d1, d2 } from './real';

afterEach(() => resetPlannerCache());

const respond = (body: unknown, ok = true, status = 200) =>
  vi.fn(async () => ({ ok, status, json: async () => body }) as Response);

describe('loadPlanner', () => {
  it('fetches the game file once per page view', async () => {
    const fetchFn = respond(d1.file);
    const [a, b] = await Promise.all([
      loadPlanner('d1', fetchFn as never),
      loadPlanner('d1', fetchFn as never),
    ]);
    expect(a).toBe(b);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(plannerFileUrl('d1'));
  });

  it.each([
    ['an error status', respond({}, false, 500)],
    ['another game’s file', respond(d2.file)],
    ['a different version', respond({ ...d1.file, v: 2 })],
    ['no items', respond({ v: 1, game: 'd1' })],
    ['nothing', respond(null)],
  ])('rejects %s and does not cache the failure', async (_name, bad) => {
    await expect(loadPlanner('d1', bad as never)).rejects.toThrow();
    await expect(loadPlanner('d1', respond(d1.file) as never)).resolves.toMatchObject({
      game: 'd1',
    });
  });
});

describe('scopeItems', () => {
  it('lists only the items the slot may hold', () => {
    const melee = getSlot('d1', 'melee');
    const ranged = getSlot('d1', 'ranged');
    const armor = getSlot('d1', 'armor');
    if (!melee || !ranged || !armor) throw new Error('slots');
    const weapons = d1.data.items('weapons');
    const meleeItems = scopeItems(weapons, melee);
    expect(meleeItems.length).toBeGreaterThan(30);
    expect(meleeItems.every((i) => i.kind === 'melee')).toBe(true);
    expect(scopeItems(weapons, ranged).every((i) => i.kind === 'ranged')).toBe(true);
    expect(meleeItems.length + scopeItems(weapons, ranged).length).toBe(weapons.length);
    expect(scopeItems(d1.data.items('armor'), armor)).toHaveLength(d1.data.items('armor').length);

    const boots = getSlot('d2', 'boots');
    if (!boots) throw new Error('slot');
    const pieces = scopeItems(d2.data.items('armor'), boots);
    expect(pieces.length).toBeGreaterThan(20);
    expect(pieces.every((i) => i.slot === 'boots')).toBe(true);
  });
});

describe('scopeDefs', () => {
  const defsOf = (game: 'd1' | 'd2', category: string) =>
    getFilterConfig(game, category)?.defs ?? [];
  const keys = (defs: readonly { key: string }[]) => defs.map((d) => d.key);

  it('removes the Type filter the slot already fixes, and what only fits the other type', () => {
    const melee = getSlot('d1', 'melee');
    const ranged = getSlot('d1', 'ranged');
    if (!melee || !ranged) throw new Error('slots');
    const all = defsOf('d1', 'weapons');
    expect(keys(all)).toContain('kind');
    expect(keys(all)).toContain('combo');

    const meleeDefs = scopeDefs(all, melee);
    expect(keys(meleeDefs)).not.toContain('kind');
    // The weapon-type row no longer waits for a Type choice, and the combo length stays.
    const weaponType = meleeDefs.find((d) => d.key === 'weaponType');
    expect(weaponType?.showWhen).toBeUndefined();
    // ... and becomes the first step.
    expect(weaponType?.kind === 'type' && weaponType.level).toBe(1);
    expect(keys(meleeDefs)).toContain('combo');

    const rangedDefs = scopeDefs(all, ranged);
    expect(keys(rangedDefs)).not.toContain('kind');
    expect(keys(rangedDefs)).not.toContain('combo');
    expect(keys(rangedDefs)).toContain('weaponType');
    expect(all.find((d) => d.key === 'weaponType')?.showWhen).toBeDefined();
  });

  it('Dungeons II: ammo only for ranged, the armor slot filter goes for a Helmet slot', () => {
    const melee = getSlot('d2', 'melee');
    const ranged = getSlot('d2', 'ranged');
    const helmet = getSlot('d2', 'helmet');
    if (!melee || !ranged || !helmet) throw new Error('slots');
    const weapons = defsOf('d2', 'weapons');
    expect(keys(scopeDefs(weapons, melee))).not.toContain('ammo');
    expect(keys(scopeDefs(weapons, ranged))).toContain('ammo');
    const armor = defsOf('d2', 'armor');
    const helmetDefs = scopeDefs(armor, helmet);
    expect(keys(helmetDefs)).not.toContain('slot');
    expect(keys(helmetDefs)).toContain('armorSet');
    const set = helmetDefs.find((d) => d.key === 'armorSet');
    expect(set?.kind === 'type' && set.level).toBe(1);
  });

  it('leaves unscoped slots and unrelated fields alone', () => {
    const armor = getSlot('d1', 'armor');
    const artifact = getSlot('d1', 'artifact1');
    if (!armor || !artifact) throw new Error('slots');
    const defs = defsOf('d1', 'armor');
    expect(scopeDefs(defs, armor)).toEqual(defs);
    // A scoped slot over defs without its field.
    const melee = getSlot('d1', 'melee');
    if (!melee) throw new Error('slot');
    expect(scopeDefs(defs, melee)).toEqual(defs);
  });
});

describe('indexPlanner', () => {
  it('finds items and their extras by category and slug', () => {
    expect(d1.data.item('weapons', 'axe')?.name).toBe('Axe');
    expect(d1.data.item('armor', 'axe')).toBeUndefined();
    expect(d1.data.extra('weapons', 'axe')?.pt?.length).toBeGreaterThan(1);
    expect(d1.data.items('talismans')).toEqual([]);
    expect(d2.data.extra('talismans', 'amethyst-lens')?.tr).toHaveLength(3);
  });

  it('builds the Forge input of a D1 weapon from its table and curves', () => {
    const axe = d1.data.forgeItem('axe');
    expect(axe?.powerTable?.[0]).toMatchObject({ power: 1 });
    expect(axe?.rating).toBeGreaterThan(0);
    expect(axe?.curves.kind).toBeDefined();
    expect(axe?.curves.baseline).toBeDefined();
    expect(d1.data.forgeItem('battle-robe')).toBeUndefined();
    expect(d2.data.forgeItem('battlestaff')).toBeUndefined();
  });

  it('copes with a weapon that has no table, rating or curves of its own', () => {
    const file: PlannerFile = {
      v: 1,
      game: 'd1',
      items: {
        weapons: [
          {
            id: 'd1:weapons:w',
            slug: 'w',
            game: 'd1',
            category: 'weapons',
            name: 'W',
            tags: [],
            quality: 'verified',
          },
        ],
      },
      labels: {},
      extras: {},
      curves: { byWeaponType: {}, baseline: {} },
    };
    expect(indexPlanner(file).forgeItem('w')).toEqual({ curves: {} });
  });
});

describe('the committed planner files (D-096)', () => {
  const root = process.cwd();

  it.each(GAME_IDS)('%s: public/planner is what data:index builds, and small enough', (game) => {
    const file = path.join(root, 'public', 'planner', `${game}.json`);
    expect(existsSync(file), 'run npm run data:index').toBe(true);
    const text = readFileSync(file, 'utf8');
    const real = game === 'd1' ? d1 : d2;
    expect(text).toBe(JSON.stringify(real.file));
    expect(gzipSync(text).length).toBeLessThanOrEqual(MAX_PLANNER_GZIP_BYTES);
  });

  it('covers every slot category with every entity, filters and labels', () => {
    for (const game of GAME_IDS) {
      const real = game === 'd1' ? d1 : d2;
      for (const category of plannerCategories(game)) {
        const entities = JSON.parse(
          readFileSync(path.join(root, 'data', 'generated', game, `${category}.json`), 'utf8'),
        ) as unknown[];
        expect(real.file.items[category]).toHaveLength(entities.length);
        expect(real.file.labels[category]).toBeDefined();
        expect(getFilterConfig(game, category)).toBeDefined();
      }
    }
  });

  it('builds an empty list for a category without entities', () => {
    const file = buildPlannerFile('d1', {}, () => undefined);
    expect(file.items.weapons).toEqual([]);
    expect(file.extras.armor).toEqual({});
  });

  it('Dungeons II ships no curves (no documented power scaling)', () => {
    expect(d2.file.curves).toBeUndefined();
    expect(d1.file.curves?.byWeaponType).toBeDefined();
  });
});
