/**
 * Linking: resolves the raw names parsers left in `_refs` to entity ids
 * (`[ Plans ]/04-DATA-PIPELINE.md` "Linking"): exact name, then case/punctuation-insensitive
 * name (the slug), then a redirect alias. Names that stay unresolved remain as raw text where
 * the schema allows it (`locations`, `drops`) and are reported; elsewhere they are dropped and
 * reported.
 */
import { slugify } from '@/lib/utils/slugify';
import { listOf, refsOf, type Ent, type Findings, type GameData } from './types';

export const keyOf = (name: string) => slugify(name) || name.trim().toLowerCase();

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

const idsOf = (entities: Ent[] | undefined, index: NameIndex) => {
  for (const e of entities ?? []) index.add(e.name, e.id);
};

/** `"Squid Coast (Only once)"`, `"Abyssal Monument Daily Trial"` → the location name. */
export function cleanLocation(line: string): string {
  return line
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s+Daily Trial$/i, '')
    .trim();
}

export interface LinkOptions {
  /** `keyOf(name)` → canonical name found through a redirect. */
  aliases?: Map<string, string>;
  /** Collects names that did not resolve (to look up redirects for). */
  misses?: Set<string>;
}

const hasRefs = (e: Ent) => e._refs !== undefined;

export function linkGame(data: GameData, findings: Findings, opts: LinkOptions = {}): void {
  const locations = new NameIndex();
  const enchantments = new NameIndex();
  const items = new NameIndex();
  const equipment = new NameIndex();
  const mobs = new NameIndex();
  const dlcs = new Map<string, string>();
  idsOf(data.locations, locations);
  idsOf(data.enchantments, enchantments);
  for (const category of ['weapons', 'armor']) idsOf(data[category], equipment);
  for (const category of ['weapons', 'armor', 'artifacts']) idsOf(data[category], items);
  idsOf(data.mobs, mobs);
  for (const dlc of data.dlcs ?? []) dlcs.set(keyOf(dlc.name), dlc.slug);

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

  function lookup(index: NameIndex, name: string): string | undefined {
    const direct = index.get(name);
    if (direct) return direct;
    const alias = opts.aliases?.get(keyOf(name));
    const viaAlias = alias ? index.get(alias) : undefined;
    if (viaAlias) return viaAlias;
    opts.misses?.add(name);
    return undefined;
  }
  function lookupDlc(name: string): string | undefined {
    const direct = dlcs.get(keyOf(name));
    if (direct) return direct;
    const alias = opts.aliases?.get(keyOf(name));
    return alias ? dlcs.get(keyOf(alias)) : undefined;
  }
  const unique = <T>(values: T[]) => [...new Set(values)];

  // Gilded drops: item location lines "Gilded: <Ancient mob>" → mob name → item ids.
  const gildedBy = new Map<string, string[]>();

  // ---- weapons, armor, artifacts ---------------------------------------------------------
  for (const category of ['weapons', 'armor', 'artifacts']) {
    for (const entity of data[category] ?? []) {
      if (!hasRefs(entity)) continue;
      const refs = refsOf(entity);
      const label = `d1:${category}:${entity.slug}`;
      if (category !== 'artifacts') {
        const built = unique(
          listOf(refs.builtIn)
            .map((name) => {
              const id = lookup(enchantments, name);
              if (!id) drop(category, entity.name, `built-in enchantment "${name}" not found`);
              return id;
            })
            .filter((id): id is string => !!id),
        );
        entity.builtInEnchantments = built.map((enchantmentId) => ({ enchantmentId }));
      }
      const dlcName = typeof refs.dlc === 'string' ? refs.dlc : undefined;
      if (dlcName) {
        const slug = lookupDlc(dlcName);
        if (slug) entity.dlc = slug;
        else drop(category, entity.name, `DLC "${dlcName}" not found`);
      }
      const resolved: string[] = [];
      for (const line of listOf(refs.locations)) {
        const gilded = /^gilded:\s*(.*)$/i.exec(line);
        if (gilded) {
          const mob = (gilded[1] ?? '').trim();
          if (mob && !/^\?+$/.test(mob))
            gildedBy.set(keyOf(mob), [...(gildedBy.get(keyOf(mob)) ?? []), entity.id]);
          continue;
        }
        if (/^(?:unobtainable|unknown|n\/a)$/i.test(line)) continue;
        const name = cleanLocation(line);
        if (!name) continue;
        const id = lookup(locations, name);
        if (id) resolved.push(id);
        else {
          resolved.push(name);
          track(name, label);
        }
      }
      entity.locations = unique(resolved);
    }
  }

  // ---- enchantments ----------------------------------------------------------------------
  for (const entity of data.enchantments ?? []) {
    if (!hasRefs(entity)) continue;
    const refs = refsOf(entity);
    entity.builtInto = unique(
      listOf(refs.builtInto)
        .map((name) => {
          const id = lookup(equipment, name);
          if (!id) drop('enchantments', entity.name, `built-into item "${name}" not found`);
          return id;
        })
        .filter((id): id is string => !!id),
    );
  }

  // ---- DLC ---------------------------------------------------------------------------------
  for (const dlc of data.dlcs ?? []) {
    if (!hasRefs(dlc)) continue;
    const refs = refsOf(dlc);
    dlc.locationIds = unique(
      listOf(refs.locations)
        .map((name) => {
          const id = lookup(locations, name);
          if (!id) drop('dlcs', dlc.name, `mission "${name}" not found`);
          return id;
        })
        .filter((id): id is string => !!id),
    );
    for (const [field, index, category] of [
      ['mobsAdded', mobs, 'mobs'],
      ['enchantmentsAdded', enchantments, 'enchantments'],
    ] as const) {
      for (const name of listOf(refs[field])) {
        const id = lookup(index, name);
        const target = (data[category] ?? []).find((e) => e.id === id);
        if (target && !target.dlc) target.dlc = dlc.slug;
      }
    }
  }

  // ---- locations ---------------------------------------------------------------------------
  for (const location of data.locations ?? []) {
    if (!hasRefs(location)) continue;
    const refs = refsOf(location);
    location.mobIds = unique(
      listOf(refs.mobs)
        .map((name) => {
          const id = lookup(mobs, name);
          if (!id) drop('locations', location.name, `mob "${name}" not found`);
          return id;
        })
        .filter((id): id is string => !!id),
    );
    if (location.locationType === 'secret') {
      const parent = listOf(refs.unlock)
        .map((name) => lookup(locations, name))
        .find((id): id is string => !!id && id !== location.id);
      if (parent) location.secretOf = parent;
    }
  }

  // ---- mobs --------------------------------------------------------------------------------
  for (const mob of data.mobs ?? []) {
    if (!hasRefs(mob)) continue;
    const refs = refsOf(mob);
    mob.locationIds = unique(
      listOf(refs.locations)
        .map((name) => lookup(locations, name))
        .filter((id): id is string => !!id),
    );
    const drops: string[] = [];
    for (const text of listOf(refs.drops)) {
      // "Bonebow (Daily Trial)" → the Bonebow; the qualifier is not part of the name.
      const bare = text.replace(/\s*\([^)]*\)/g, '').trim();
      const id = items.get(bare) ?? enchantments.get(bare);
      if (id) drops.push(id);
      else {
        drops.push(text);
        track(text, `d1:mobs:${mob.slug}`);
      }
    }
    if (mob.mobType === 'ancient') drops.push(...(gildedBy.get(keyOf(mob.name)) ?? []));
    mob.drops = unique(drops);
  }

  // ---- cosmetics ---------------------------------------------------------------------------
  for (const cosmetic of data.cosmetics ?? []) {
    if (!hasRefs(cosmetic) && typeof cosmetic.dlc !== 'string') continue;
    if (typeof cosmetic.dlc === 'string' && !data.dlcs?.some((d) => d.slug === cosmetic.dlc)) {
      drop('cosmetics', cosmetic.name, `DLC "${cosmetic.dlc}" not found`);
      delete cosmetic.dlc;
    }
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
