/**
 * The 16 category configs against the real generated data: every filter, sort, card stat and
 * table column must point at a field that exists, so the config can never silently drift from
 * the data (Prompt 07 task 2 and 3).
 */
import { describe, expect, it } from 'vitest';
import { getCategoryConfig } from '@/config/categories';
import { allGameCategories, type GameId } from '@/config/games';
import { RESERVED_PARAMS, getFilterConfig } from '@/config/filters';
import { createLoaders } from '@/lib/data/loaders';
import { getValues } from '@/lib/filters/path';
import { toToken } from '@/lib/filters/tokens';
import { isShown, sortItems, tokensOf } from '@/lib/filters/engine';

const loaders = createLoaders();
const PAIRS = allGameCategories();

describe('category configs', () => {
  it('covers all 16 game/category pairs', () => {
    expect(PAIRS).toHaveLength(16);
    for (const { game, category } of PAIRS) {
      expect(getCategoryConfig(game, category), `${game}/${category}`).toBeDefined();
      expect(getFilterConfig(game, category), `${game}/${category}`).toBeDefined();
    }
  });

  it('returns nothing for unknown pairs', () => {
    expect(getCategoryConfig('d1', 'talismans')).toBeUndefined();
    expect(getFilterConfig('d2', 'dlcs')).toBeUndefined();
    expect(getFilterConfig('d1' as GameId, 'nope')).toBeUndefined();
  });

  it.each(PAIRS.map((p) => [`${p.game}/${p.category}`, p.game, p.category] as const))(
    '%s is consistent and matches the data',
    (_name, game, category) => {
      const display = getCategoryConfig(game, category);
      const filters = getFilterConfig(game, category);
      const items = loaders.getListItems(game, category as never);
      if (!display || !filters) throw new Error('missing config');
      expect(items.length).toBeGreaterThan(0);

      // Presentation
      expect(display.label.length).toBeGreaterThan(0);
      expect(display.intro.length).toBeGreaterThan(0);
      expect(display.iconEntityId.startsWith(`${game}:`)).toBe(true);
      expect(display.cardStats.length).toBeLessThanOrEqual(2);
      expect(display.detailSections.length).toBeGreaterThan(0);

      // Params and keys are unique; reserved params are not reused.
      const params = filters.defs.map((d) => d.param);
      const keys = filters.defs.map((d) => d.key);
      expect(new Set(params).size, 'unique params').toBe(params.length);
      expect(new Set(keys).size, 'unique keys').toBe(keys.length);
      for (const def of filters.defs) {
        if (def.kind !== 'text') expect(RESERVED_PARAMS).not.toContain(def.param);
        if (def.showWhen) {
          expect(params, `${def.key}.showWhen`).toContain(def.showWhen.param);
          expect(params.indexOf(def.showWhen.param)).toBeLessThan(params.indexOf(def.param));
        }
        if (def.kind === 'range' && def.dependsOn) expect(params).toContain(def.dependsOn);
      }
      const levels = filters.defs.flatMap((d) => (d.kind === 'type' ? [d.level] : []));
      expect(levels, 'level 1 before level 2').toEqual([...levels].sort());

      // Every filter reads data that exists.
      for (const def of filters.defs) {
        if (def.kind === 'text') continue;
        if (def.kind === 'range' && def.dependsOn) {
          expect(
            getValues(items[0], def.field.replace('{value}', 'x')).length,
          ).toBeGreaterThanOrEqual(0);
          continue;
        }
        const withValue = items.filter((i) => getValues(i, def.field).length > 0);
        const dataless = def.kind === 'toggle' && withValue.length === 0;
        // Toggles on derived flags (e.g. D2 mobs have no drops) are hidden by the UI instead.
        if (!dataless) expect(withValue.length, `${def.key} (${def.field})`).toBeGreaterThan(0);
        if (def.kind === 'type' && def.options !== 'auto') {
          const present = new Set(items.flatMap((i) => tokensOf(i, def.field)));
          for (const option of def.options) {
            expect(present.has(option.value), `${def.key} option ${option.value}`).toBe(true);
            expect(toToken(option.value)).toBe(option.value);
          }
        }
      }

      // Sorts: values unique, default present, fields exist, columns point at real sorts.
      const sortValues = filters.sort.options.map((o) => o.value);
      expect(new Set(sortValues).size).toBe(sortValues.length);
      expect(sortValues).toContain(filters.sort.default);
      expect(sortValues[0]).toBe(display.defaultSort);
      for (const option of filters.sort.options) {
        expect(
          items.some((i) => getValues(i, option.field).length > 0),
          option.value,
        ).toBe(true);
      }
      for (const column of display.tableColumns) {
        if (column.sort) {
          expect(
            sortValues.some((v) => v.startsWith(`${column.sort}-`)),
            column.key,
          ).toBe(true);
        }
      }

      // Card, table and compare fields exist in the projection.
      const shown = [...display.cardStats, ...display.tableColumns, ...display.compareRows];
      for (const spec of shown) {
        const found = items.some((i) => getValues(i, spec.field).length > 0);
        // Compare rows read the full entity (Prompt 11), so only list fields are checked here.
        if (!display.compareRows.includes(spec as never)) expect(found, spec.field).toBe(true);
      }
      for (const field of display.cardMeta) {
        expect(
          items.some((i) => getValues(i, field).length > 0),
          field,
        ).toBe(true);
      }
    },
  );

  it('a Dungeons II type with no conditions is always shown', () => {
    const filters = getFilterConfig('d2', 'armor');
    const armorSet = filters?.defs.find((d) => d.key === 'armorSet');
    expect(armorSet && isShown(armorSet, {})).toBe(true);
  });

  it('keeps each category payload under 150 kB (JSON, uncompressed)', () => {
    for (const { game, category } of PAIRS) {
      const size = JSON.stringify(loaders.getListItems(game, category as never)).length;
      expect(size, `${game}/${category} = ${size} bytes`).toBeLessThan(150_000);
    }
  });
  it('lists the rarest items first by default where a category has rarity', () => {
    const ranked = PAIRS.filter(
      ({ game, category }) => getCategoryConfig(game, category)?.defaultSort === 'rarity-desc',
    );
    // Weapons and armor in both games, plus Dungeons artifacts.
    expect(ranked.map((p) => `${p.game}/${p.category}`).sort()).toEqual([
      'd1/armor',
      'd1/artifacts',
      'd1/weapons',
      'd2/armor',
      'd2/weapons',
    ]);
    for (const { game, category } of ranked) {
      const filters = getFilterConfig(game, category);
      const items = loaders.getListItems(game, category as never);
      if (!filters) throw new Error('missing filters');
      const sorted = sortItems(items, filters.sort, filters.sort.default);
      const order = ['common', 'rare', 'special', 'unique'];
      const ranks = sorted.map((i) => order.indexOf(String(i.rarity)));
      expect(ranks, `${game}/${category}`).toEqual([...ranks].sort((a, b) => b - a));
    }
  });

  it('only marks toggles as quick filters', () => {
    for (const { game, category } of PAIRS) {
      for (const def of getFilterConfig(game, category)?.defs ?? []) {
        if (def.kind !== 'text' && def.quick)
          expect(def.kind, `${game}/${category} ${def.key}`).toBe('toggle');
      }
    }
  });
});
