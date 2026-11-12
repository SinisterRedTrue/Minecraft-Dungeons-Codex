/**
 * Builds the planner data file of one game from its generated entities (D-096). Pure: the
 * script `scripts/lib/planner-data.ts` reads the JSON and writes the result to
 * `public/planner/{game}.json`; tests call it with the real data.
 */
import { getCategoryConfig, type CategoryConfig } from '@/config/categories';
import { getFilterConfig, type ResolvedFilters } from '@/config/filters';
import type { GameId } from '@/config/games';
import { projectListItems } from '@/lib/data/project';
import { buildLabels, labelFields, type NameLookup } from '@/lib/filters/labels';
import type { Entity } from '@/lib/schemas';
import { plannerCategories, type SlotCategory } from './slots';
import type { GearExtra, PlannerCurves, PlannerFile } from './types';

/** The gear fields the extras read, all optional (the categories differ). */
interface GearFields {
  powerTable?: { power: number; min: number; max: number }[];
  effectValues?: { label: string; value?: number; unit?: string }[];
  tiers?: { text: string; value?: number; unit?: string }[];
}

/** `{ key: value }`, or `{}` when there is no value (keeps optional props truly absent). */
function present<K extends string, T>(key: K, value: T | undefined): { [P in K]?: T } {
  return (value === undefined ? {} : { [key]: value }) as { [P in K]?: T };
}

function extraOf(entity: Entity): GearExtra | undefined {
  const gear = entity as unknown as GearFields;
  const table = gear.powerTable;
  const extra: GearExtra = {
    ...present(
      'pt',
      table && table.length > 0
        ? table.map((p): [number, number, number] => [p.power, p.min, p.max])
        : undefined,
    ),
    ...present(
      'fx',
      gear.effectValues && gear.effectValues.length > 0
        ? gear.effectValues.map((e) => ({ label: e.label, value: e.value, unit: e.unit }))
        : undefined,
    ),
    ...present(
      'tr',
      gear.tiers?.map((t) => ({
        text: t.text,
        ...present('value', t.value),
        ...present('unit', t.unit),
      })),
    ),
  };
  return Object.keys(extra).length > 0 ? extra : undefined;
}

/** `curves` is the D1 `data/forge/d1/curves.json` (its `weapons` part is kept). */
export function buildPlannerFile(
  game: GameId,
  entities: Readonly<Partial<Record<SlotCategory, readonly Entity[]>>>,
  lookup: NameLookup,
  curves?: { weapons: PlannerCurves },
): PlannerFile {
  const file: PlannerFile = { v: 1, game, items: {}, labels: {}, extras: {} };
  for (const category of plannerCategories(game)) {
    // Every planner category has a display and a filter config (a test checks it).
    const config = getCategoryConfig(game, category) as CategoryConfig;
    const filters = getFilterConfig(game, category) as ResolvedFilters;
    const list = entities[category] ?? [];
    const items = projectListItems(game, category, list);
    file.items[category] = items;
    file.labels[category] = buildLabels({
      game,
      category,
      items,
      fields: labelFields(filters.defs, [
        ...config.cardMeta,
        ...config.tableColumns.filter((c) => c.format === 'label').map((c) => c.field),
      ]),
      lookup,
    });
    const extras: Record<string, GearExtra> = {};
    for (const entity of list) {
      const extra = extraOf(entity);
      if (extra) extras[entity.slug] = extra;
    }
    file.extras[category] = extras;
  }
  if (curves) {
    const { melee, ranged, byWeaponType, baseline } = curves.weapons;
    file.curves = {
      ...present('melee', melee),
      ...present('ranged', ranged),
      byWeaponType,
      baseline,
    };
  }
  return file;
}
