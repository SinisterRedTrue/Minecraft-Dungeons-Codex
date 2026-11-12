/** The planner data built from the real generated files, the way `data:index` does. */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { GAMES, type GameId } from '@/config/games';
import { buildCatalog, catalogMap, type CatalogSource } from '@/lib/forge/catalog';
import { indexPlanner, makeKnown } from '@/lib/planner/data';
import { buildPlannerFile } from '@/lib/planner/prepare';
import { plannerCategories, type SlotCategory } from '@/lib/planner/slots';
import type { Entity } from '@/lib/schemas';

const root = process.cwd();
const read = <T>(...parts: string[]): T =>
  JSON.parse(readFileSync(path.join(root, ...parts), 'utf8')) as T;

function realPlanner(game: GameId) {
  const names = new Map<string, string>();
  for (const category of GAMES[game].categories) {
    const file = path.join(root, 'data', 'generated', game, `${category}.json`);
    if (!existsSync(file)) continue;
    for (const e of read<Entity[]>('data', 'generated', game, `${category}.json`)) {
      names.set(e.id, e.name);
    }
  }
  const entities: Partial<Record<SlotCategory, Entity[]>> = {};
  for (const category of plannerCategories(game)) {
    entities[category] = read<Entity[]>('data', 'generated', game, `${category}.json`);
  }
  const curvesFile = path.join(root, 'data', 'forge', game, 'curves.json');
  const curvesJson = existsSync(curvesFile)
    ? read<{ weapons?: never }>('data', 'forge', game, 'curves.json')
    : undefined;
  // Dungeons II documents no power scaling: its curves file is empty.
  const curves = curvesJson?.weapons ? { weapons: curvesJson.weapons } : undefined;
  const file = buildPlannerFile(game, entities, (id) => names.get(id), curves);
  const data = indexPlanner(file);
  const catalog = buildCatalog(
    game,
    read<CatalogSource[]>('data', 'generated', game, 'enchantments.json'),
  );
  return { file, data, catalog, catalogMap: catalogMap(catalog), known: makeKnown(data, catalog) };
}

export const d1 = realPlanner('d1');
export const d2 = realPlanner('d2');
