/**
 * The planner's view of its data file (`types.ts`): lookups by category and slug, the items a
 * slot may hold, the Forge math input of a weapon, and the `Known` check the codec uses to drop
 * links to things the data no longer has. `loadPlanner` fetches the file once per page view.
 */
import type { GameId } from '@/config/games';
import type { FilterDef } from '@/lib/filters/types';
import type { ForgeItem } from '@/lib/forge/damage';
import type { ForgeEnchantment } from '@/lib/forge/enchantments';
import type { EntityListItem } from '@/lib/schemas';
import type { Known } from './codec';
import type { SlotCategory, SlotDef } from './slots';
import type { GearExtra, PlannerFile } from './types';

const files = new Map<GameId, Promise<PlannerFile>>();

export const plannerFileUrl = (game: GameId) => `/planner/${game}.json`;

/** Fetches `/planner/{game}.json` once per page view; a failed fetch is not cached (Retry works). */
export function loadPlanner(game: GameId, fetchFn: typeof fetch = fetch): Promise<PlannerFile> {
  let promise = files.get(game);
  if (!promise) {
    const fresh = fetchFn(plannerFileUrl(game))
      .then((res) => {
        if (!res.ok) throw new Error(`Planner data for ${game} returned ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        const file = data as Partial<PlannerFile> | null;
        if (!file || file.v !== 1 || file.game !== game || !file.items) {
          throw new Error(`Planner data for ${game} is not valid`);
        }
        return file as PlannerFile;
      });
    files.set(game, fresh);
    // Only a settled-and-failed promise is dropped, and none replaces it before that.
    fresh.catch(() => files.delete(game));
    promise = fresh;
  }
  return promise;
}

/** Forgets everything loaded (tests). */
export function resetPlannerCache(): void {
  files.clear();
}

/** The items of `items` a slot may hold (`scope` is `kind=melee`, `slot=helmet` …). */
export function scopeItems(items: readonly EntityListItem[], slot: SlotDef): EntityListItem[] {
  const { scope } = slot;
  return scope ? items.filter((item) => item[scope.field] === scope.value) : [...items];
}

/**
 * The slot's filter definitions: the def the scope already fixes (Type = Melee) is removed, and
 * the defs that only made sense under another value of it go too, so the picker never shows a
 * filter that cannot give a result.
 */
export function scopeDefs(defs: readonly FilterDef[], slot: SlotDef): FilterDef[] {
  const { scope } = slot;
  if (!scope) return [...defs];
  const fixed = defs.find((def) => def.kind === 'type' && def.field === scope.field);
  if (!fixed) return [...defs];
  // With its level 1 gone, the level 2 rows become the first step.
  const promote = (def: FilterDef): FilterDef =>
    def.kind === 'type' && def.level === 2 && fixed.kind === 'type' && fixed.level === 1
      ? { ...def, level: 1 }
      : def;
  return defs.flatMap((def) => {
    if (def === fixed) return [];
    const cond = def.kind === 'text' ? undefined : def.showWhen;
    if (!cond || cond.param !== fixed.param) return [promote(def)];
    if (![cond.equals].flat().includes(scope.value)) return [];
    const unconditional: Record<string, unknown> = { ...def };
    delete unconditional.showWhen;
    return [promote(unconditional as unknown as FilterDef)];
  });
}

export interface PlannerData {
  game: GameId;
  file: PlannerFile;
  /** All items of a slot category (unscoped). */
  items(category: SlotCategory): EntityListItem[];
  item(category: SlotCategory, slug: string): EntityListItem | undefined;
  extra(category: SlotCategory, slug: string): GearExtra | undefined;
  /** The Forge math input of a D1 weapon, or `undefined` for anything without damage data. */
  forgeItem(slug: string): ForgeItem | undefined;
}

export function indexPlanner(file: PlannerFile): PlannerData {
  const bySlug = new Map<string, EntityListItem>();
  for (const [category, list] of Object.entries(file.items)) {
    for (const item of list) bySlug.set(`${category}/${item.slug}`, item);
  }
  const find = (category: SlotCategory, slug: string) => bySlug.get(`${category}/${slug}`);
  const extra = (category: SlotCategory, slug: string) => file.extras[category]?.[slug];

  return {
    game: file.game,
    file,
    items: (category) => file.items[category] ?? [],
    item: find,
    extra,
    forgeItem(slug) {
      const weapon = find('weapons', slug);
      const curves = file.curves;
      if (!weapon || !curves) return undefined;
      const kind = weapon.kind === 'ranged' ? 'ranged' : 'melee';
      const table = extra('weapons', slug)?.pt;
      const rating = (weapon.stats as { damage?: number } | undefined)?.damage;
      const type = curves.byWeaponType[String(weapon.weaponType)];
      const kindCurve = curves[kind];
      const baseline = curves.baseline[kind];
      return {
        ...(table ? { powerTable: table.map(([power, min, max]) => ({ power, min, max })) } : {}),
        ...(rating === undefined ? {} : { rating }),
        curves: {
          ...(type ? { type } : {}),
          ...(kindCurve ? { kind: kindCurve } : {}),
          ...(baseline ? { baseline } : {}),
        },
      };
    },
  };
}

/** What the codec checks a link against: the planner data and the Forge enchantment catalog. */
export function makeKnown(data: PlannerData, catalog: readonly ForgeEnchantment[]): Known {
  const bySlug = new Map(catalog.map((e) => [e.slug, e.appliesTo]));
  return {
    hasItem: (slot, slug) => {
      const item = data.item(slot.category, slug);
      return item !== undefined && scopeItems([item], slot).length === 1;
    },
    enchantment: (slug) => bySlug.get(slug),
  };
}
