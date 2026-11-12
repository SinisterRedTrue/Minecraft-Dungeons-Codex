/**
 * What `{{Infobox Dungeons item}}`'s `stat1..stat4` mean (decision D-034).
 *
 * Read from the template source (revision 3751922): the `stat` param picks the label set.
 *   stat = melee  → stat1 "Power", stat2 "Speed", stat3 "Area"
 *   stat = ranged → stat1 "Power", stat2 "Speed", stat3 "Ammo", stat4 "Charge" (`fast` | `slow`)
 * Each numeric stat is drawn as a bar of `value / 14 * 100` %, so values sit on a 0–14 scale.
 * Armor pages have no `stat` param and no stat bars (checked on Champion's Armor).
 * Verified against the rendered infobox labels of Claymore (11.5 / 1 / 6.5), Katana
 * (7.9 / 1.9 / 7.2) and Hunting Bow (4.2 / 3.7 / 4.1).
 *
 * The wiki's "Power" bar is the weapon's damage rating, so it maps to `stats.damage`
 * (`[ Plans ]/03-CONTENT-MODEL.md` §3.1); it is not the item power level.
 */

export const STAT_SCALE_MAX = 14;

export type StatKind = 'melee' | 'ranged';
type StatKey = 'damage' | 'speed' | 'area' | 'ammo';

export interface StatDef {
  key: StatKey;
  /** Label the wiki infobox shows. */
  label: string;
}

export const STAT_MAP: Record<StatKind, Record<'stat1' | 'stat2' | 'stat3', StatDef>> = {
  melee: {
    stat1: { key: 'damage', label: 'Power' },
    stat2: { key: 'speed', label: 'Speed' },
    stat3: { key: 'area', label: 'Area' },
  },
  ranged: {
    stat1: { key: 'damage', label: 'Power' },
    stat2: { key: 'speed', label: 'Speed' },
    stat3: { key: 'ammo', label: 'Ammo' },
  },
};

export interface InfoboxStats {
  stats?: Partial<Record<StatKey, number>>;
  /** Ranged only: the `stat4` charge speed. Not numeric, so it is not part of `stats`. */
  charge?: 'fast' | 'slow';
}

/** Maps infobox params (`stat`, `stat1..4`) to `stats` keys. Unknown kinds give `{}`. */
export function mapInfoboxStats(
  params: Readonly<Record<string, string | undefined>>,
): InfoboxStats {
  const kind = params.stat?.trim().toLowerCase();
  if (kind !== 'melee' && kind !== 'ranged') return {};
  const stats: Partial<Record<StatKey, number>> = {};
  for (const [param, def] of Object.entries(STAT_MAP[kind])) {
    const raw = params[param]?.trim();
    if (!raw) continue;
    const value = Number(raw.replace(',', '.'));
    if (Number.isFinite(value)) stats[def.key] = value;
  }
  const out: InfoboxStats = {};
  if (Object.keys(stats).length) out.stats = stats;
  const charge = params.stat4?.trim().toLowerCase();
  if (kind === 'ranged' && (charge === 'fast' || charge === 'slow')) out.charge = charge;
  return out;
}
