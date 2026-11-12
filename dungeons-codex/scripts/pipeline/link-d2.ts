/**
 * Linking for Dungeons II (`[ Plans ]/04-DATA-PIPELINE.md` "Linking"): resolves the raw names the
 * D2 parsers left in `_refs` to entity ids. Same order as D1: exact name, then the slug (case and
 * punctuation insensitive), then a redirect alias. Raw text stays only where the schema allows it
 * (`locations`, `obtaining`, quest reward `items` / `randomFrom.from`) and is reported.
 */
import { listOf, refsOf, type Findings, type GameData } from './types';
import { keyOf, type LinkOptions } from './link';

interface SourceRef {
  kind: 'quest' | 'location' | 'mob';
  name: string;
  raw: string;
}

interface RewardRef {
  when: 'first' | 'subsequent' | 'always';
  xp?: number;
  items: string[];
  random: { text: string; count: number; kind: 'gear' | 'armor' | 'artifact'; names: string[] }[];
}

class NameIndex {
  private readonly map = new Map<string, string>();
  add(name: string, id: string): void {
    const key = keyOf(name);
    if (!this.map.has(key)) this.map.set(key, id);
  }
  get(name: string): string | undefined {
    return this.map.get(keyOf(name));
  }
}

/** Region headings that spawn lists use as labels ("The Sift: Lullaby Hills, …"), not places. */
const REGIONS = new Set(['the-sift', 'sift', 'overworld']);

const unique = <T>(values: T[]) => [...new Set(values)];

export function linkGameD2(data: GameData, findings: Findings, opts: LinkOptions = {}): void {
  const index = (categories: string[]) => {
    const names = new NameIndex();
    for (const category of categories)
      for (const e of data[category] ?? []) names.add(e.name, e.id);
    return names;
  };
  const locations = index(['locations']);
  const quests = index(['quests']);
  const mobs = index(['mobs']);
  const items = index(['weapons', 'armor', 'artifacts', 'talismans', 'enchantments']);
  const artifacts = index(['artifacts']);

  // Stations and sub-areas → the main locations that list them (resolved only when unambiguous).
  const parents = new Map<string, Set<string>>();
  for (const location of data.locations ?? []) {
    for (const name of [...listOf(location.stations), ...listOf(location.subAreas)]) {
      const set = parents.get(keyOf(name)) ?? new Set<string>();
      set.add(location.id);
      parents.set(keyOf(name), set);
    }
  }
  // Armor sets → the pieces that carry the set name.
  const sets = new Map<string, string[]>();
  for (const piece of data.armor ?? []) {
    const key = keyOf(String(piece.armorSet ?? ''));
    sets.set(key, [...(sets.get(key) ?? []), piece.id]);
  }

  const unresolved = new Map<string, { category: string; value: string; usedBy: Set<string> }>();
  const track = (value: string, usedBy: string) => {
    const category = usedBy.split(':')[1] ?? '';
    const key = `${category}\u0000${value}`;
    const entry = unresolved.get(key) ?? { category, value, usedBy: new Set<string>() };
    entry.usedBy.add(usedBy);
    unresolved.set(key, entry);
  };
  const drop = (category: string, entity: string, message: string) =>
    findings.droppedRefs.push({ category, entity, message });

  function lookup(names: NameIndex, name: string): string | undefined {
    const direct = names.get(name);
    if (direct) return direct;
    const alias = opts.aliases?.get(keyOf(name));
    const viaAlias = alias ? names.get(alias) : undefined;
    if (viaAlias) return viaAlias;
    opts.misses?.add(name);
    return undefined;
  }
  /** A main location, or the one main location that lists this station / sub-area. */
  function lookupLocation(name: string): { id?: string; area?: string } {
    const direct = locations.get(name);
    if (direct) return { id: direct };
    const owners = parents.get(keyOf(name));
    if (owners?.size === 1) return { id: [...owners][0] };
    return { area: name };
  }

  /** Resolves a drop/obtain source: quest, location (or one of its areas), or mob. */
  function resolveSource(source: SourceRef, usedBy: string): string {
    const names = source.kind === 'quest' ? quests : source.kind === 'mob' ? mobs : undefined;
    const id =
      names !== undefined ? names.get(source.name) : (lookupLocation(source.name).id ?? undefined);
    if (id) return id;
    track(source.raw, usedBy);
    return source.raw;
  }

  // ---- weapons, armor, artifacts, talismans, enchantments ------------------------------------
  const fieldOf: Record<string, string> = {
    weapons: 'locations',
    armor: 'locations',
    artifacts: 'locations',
    talismans: 'locations',
    enchantments: 'obtaining',
  };
  for (const [category, field] of Object.entries(fieldOf)) {
    for (const entity of data[category] ?? []) {
      if (entity._refs === undefined) continue;
      const sources = (refsOf(entity).sources ?? []) as SourceRef[];
      entity[field] = unique(sources.map((s) => resolveSource(s, entity.id)));
    }
  }

  // ---- quests --------------------------------------------------------------------------------
  const resolveNames = (kind: 'gear' | 'armor' | 'artifact', names: string[], usedBy: string) =>
    names.flatMap((name) => {
      if (kind === 'armor') {
        const pieces = sets.get(keyOf(name));
        if (pieces?.length) return pieces;
      }
      const id =
        kind === 'gear'
          ? lookupLocation(name).id
          : kind === 'artifact'
            ? lookup(artifacts, name)
            : undefined;
      if (id) return [id];
      track(name, usedBy);
      return [name];
    });

  for (const quest of data.quests ?? []) {
    if (quest._refs === undefined) continue;
    const refs = refsOf(quest);
    const ids: string[] = [];
    const areas: string[] = [];
    for (const name of listOf(refs.locations)) {
      const found = lookupLocation(name);
      if (found.id) ids.push(found.id);
      else areas.push(name);
    }
    quest.locationIds = unique(ids);
    quest.areas = unique(areas);
    quest.rewards = ((refs.rewards ?? []) as RewardRef[]).map((block) => {
      const reward: Record<string, unknown> = {
        when: block.when,
        items: unique(
          block.items.map((name) => {
            const id = lookup(items, name);
            if (id) return id;
            track(name, quest.id);
            return name;
          }),
        ),
      };
      if (block.xp !== undefined) reward.xp = block.xp;
      if (block.random.length) {
        reward.randomFrom = block.random.map((pool) => ({
          text: pool.text,
          count: pool.count,
          from: unique(resolveNames(pool.kind, pool.names, quest.id)),
        }));
      }
      return reward;
    });
  }

  // ---- mobs and locations --------------------------------------------------------------------
  for (const mob of data.mobs ?? []) {
    if (mob._refs === undefined) continue;
    mob.locationIds = unique(
      listOf(refsOf(mob).locations)
        .filter((name) => !REGIONS.has(keyOf(name)))
        .map((name) => {
          const id = lookupLocation(name).id;
          if (!id) drop('mobs', mob.name, `spawn area "${name}" is not a single main location`);
          return id;
        })
        .filter((id): id is string => !!id),
    );
  }
  for (const location of data.locations ?? []) {
    if (location._refs === undefined) continue;
    location.mobIds = unique(
      listOf(refsOf(location).mobs)
        .map((name) => {
          const id = lookup(mobs, name);
          if (!id) drop('locations', location.name, `mob "${name}" not found`);
          return id;
        })
        .filter((id): id is string => !!id),
    );
  }

  for (const entry of [...unresolved.values()].sort(
    (a, b) => a.category.localeCompare(b.category) || a.value.localeCompare(b.value),
  )) {
    findings.unresolved.push({
      category: entry.category,
      value: entry.value,
      usedBy: [...entry.usedBy].sort(),
    });
  }
}
