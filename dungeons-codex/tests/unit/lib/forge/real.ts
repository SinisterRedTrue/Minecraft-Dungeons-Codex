/** Real generated data for the Forge tests: items with and without power tables. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildCatalog, catalogMap, type CatalogSource } from '@/lib/forge/catalog';
import type { ItemCurves } from '@/lib/forge/curves';
import type { ForgeItem } from '@/lib/forge/damage';
import type { PowerPoint } from '@/lib/forge/interpolate';

const root = process.cwd();
const read = <T>(...parts: string[]) =>
  JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

interface Gear {
  slug: string;
  kind?: 'melee' | 'ranged';
  weaponType?: string;
  powerTable?: PowerPoint[];
  stats?: { damage?: number };
}

export const weapons = read<Gear[]>('data', 'generated', 'd1', 'weapons.json');
export const armor = read<Gear[]>('data', 'generated', 'd1', 'armor.json');
export const rawEnchantments = read<CatalogSource[]>(
  'data',
  'generated',
  'd1',
  'enchantments.json',
);

interface CurvesFile {
  weapons: {
    melee: ItemCurves['kind'];
    ranged: ItemCurves['kind'];
    byWeaponType: Record<string, ItemCurves['type']>;
    baseline: { melee: ItemCurves['baseline']; ranged: ItemCurves['baseline'] };
  };
  armor: { health: ItemCurves['kind'] };
}
export const curvesFile = read<CurvesFile>('data', 'forge', 'd1', 'curves.json');

const find = (list: Gear[], slug: string) => {
  const found = list.find((g) => g.slug === slug);
  if (!found) throw new Error(`fixture ${slug} missing`);
  return found;
};

export function weaponItem(slug: string): ForgeItem {
  const w = find(weapons, slug);
  const kind = w.kind ?? 'melee';
  const type = w.weaponType ? curvesFile.weapons.byWeaponType[w.weaponType] : undefined;
  const kindCurve = curvesFile.weapons[kind];
  const baseline = curvesFile.weapons.baseline[kind];
  return {
    ...(w.powerTable ? { powerTable: w.powerTable } : {}),
    ...(w.stats?.damage === undefined ? {} : { rating: w.stats.damage }),
    curves: {
      ...(type ? { type } : {}),
      ...(kindCurve ? { kind: kindCurve } : {}),
      ...(baseline ? { baseline } : {}),
    },
  };
}

export function armorItem(slug: string): ForgeItem {
  const a = find(armor, slug);
  return {
    ...(a.powerTable ? { powerTable: a.powerTable } : {}),
    curves: curvesFile.armor.health ? { kind: curvesFile.armor.health } : {},
  };
}

export const claymoreTable = find(weapons, 'claymore').powerTable as PowerPoint[];
export const catalog = buildCatalog('d1', rawEnchantments);
export const catalogBySlug = catalogMap(catalog);
