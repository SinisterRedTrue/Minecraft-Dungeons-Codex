/**
 * The enchantment catalog the Forge works from: one compact entry per enchantment of a game.
 * `buildCatalog` runs in `npm run data:index` (offline, from generated JSON) and writes
 * `public/forge/{game}.json`; `loadCatalog` fetches it once per page view when a Forge mounts.
 */
import type { GameId } from '@/config/games';
import {
  classifyEnchantment,
  type EnchantmentTarget,
  type ForgeEnchantment,
  type ForgeLevel,
} from './enchantments';

/** The fields of an enchantment entity the catalog reads (D1 and D2 both have them). */
export interface CatalogSource {
  id: string;
  slug: string;
  name: string;
  description?: string | undefined;
  image?: { src: string } | undefined;
  appliesTo: readonly EnchantmentTarget[];
  levels: readonly { text: string; value?: number | undefined; unit?: string | undefined }[];
  pointCost?: readonly number[] | undefined;
}

function level(source: CatalogSource['levels'][number]): ForgeLevel {
  return {
    text: source.text,
    ...(source.value === undefined ? {} : { value: source.value }),
    ...(source.unit === undefined ? {} : { unit: source.unit }),
  };
}

/**
 * D2 has no documented power numbers, so none of its enchantments changes a number: they are
 * all plain `effect` lines there.
 */
export function buildCatalog(game: GameId, sources: readonly CatalogSource[]): ForgeEnchantment[] {
  return sources
    .map((source) => {
      const levels = source.levels.map(level);
      const cost = source.pointCost;
      return {
        id: source.id,
        slug: source.slug,
        name: source.name,
        appliesTo: [...source.appliesTo],
        kind: game === 'd2' ? ('effect' as const) : classifyEnchantment(levels, source.description),
        levels,
        ...(cost?.length === 3
          ? { pointCost: [cost[0], cost[1], cost[2]] as [number, number, number] }
          : {}),
        ...(source.image ? { image: source.image.src } : {}),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const loaded = new Map<GameId, Promise<ForgeEnchantment[]>>();

/** Fetches `/forge/{game}.json` once; a failed fetch is not cached, so a retry fetches again. */
export function loadCatalog(
  game: GameId,
  fetchFn: typeof fetch = fetch,
): Promise<ForgeEnchantment[]> {
  let promise = loaded.get(game);
  if (!promise) {
    const fresh = fetchFn(`/forge/${game}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`Forge catalog for ${game} returned ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error(`Forge catalog for ${game} is not a list`);
        return data as ForgeEnchantment[];
      });
    loaded.set(game, fresh);
    // Only a settled-and-failed promise is dropped, and none replaces it before that.
    fresh.catch(() => loaded.delete(game));
    promise = fresh;
  }
  return promise;
}

/** Slug → enchantment, for the lookups the math does per pick. */
export function catalogMap(catalog: readonly ForgeEnchantment[]): Map<string, ForgeEnchantment> {
  return new Map(catalog.map((e) => [e.slug, e]));
}

/** Forgets everything loaded (tests). */
export function resetCatalogCache(): void {
  loaded.clear();
}
