/**
 * D2 weapons: `Dungeons II:Weapon` has one table per group (melee, bows, crossbows, and the
 * melee "Unobtainable" table). A base weapon is followed by its unique variant, which is how
 * the pair is linked and how a melee weapon gets its family (`weaponType`, D-052).
 */
import { slugify } from '@/lib/utils/slugify';
import { parsePageHtml } from '../../wiki/client';
import { parseWikitables, type ParsedTable } from '../../wiki/tables';
import { cellAt, col, firstImage } from '../common';
import type { Draft, ParseContext, ParseResult } from '../types';
import {
  d2Draft,
  d2First,
  d2Lines,
  d2PageTitle,
  d2Rarity,
  infoText,
  loadD2Pages,
  pairWithBase,
  parseD2Effects,
  sourceFor,
  sourcesOf,
} from './common';

const WEAPON_LIST_PAGE = 'Dungeons II:Weapon';

/** Keyword families for melee base weapons; any other base weapon is its own family. */
const MELEE_FAMILIES: [RegExp, string][] = [
  [/^(?:great)?axe$/i, 'axe'],
  [/\b(?:hammer|mallet)$/i, 'hammer'],
  [/\bsickles?$/i, 'sickle'],
  [/\bdaggers?$/i, 'dagger'],
  [/^(?:great|long)?sword$/i, 'sword'],
  [/\bspear$/i, 'spear'],
];

/** `"Battle Hammer"` → `hammer`, `"Claymore"` → `claymore`. */
export function meleeFamily(baseName: string): string {
  return (
    MELEE_FAMILIES.find(([pattern]) => pattern.test(baseName.trim()))?.[1] ?? slugify(baseName)
  );
}

export interface WeaponRow {
  name: string;
  pageTitle: string;
  kind: 'melee' | 'ranged';
  rangedType?: 'bow' | 'crossbow';
  unique: boolean;
  rarity: ReturnType<typeof d2Rarity>;
  effectLines: string[];
  combo?: number;
  ammo?: number;
  sources: ReturnType<typeof sourcesOf>;
  icon?: string;
  obtainable: boolean;
}

function numberIn(text: string): number | undefined {
  return /^\d+$/.test(text.trim()) ? Number(text.trim()) : undefined;
}

function isWeaponTable(table: ParsedTable): boolean {
  return col(table.headers, /^name/i) >= 0 && col(table.headers, /^rarity/i) >= 0;
}

/** Weapon rows of every table, in page order, grouped per table (pairs never cross tables). */
export function readWeaponTables(html: string): WeaponRow[][] {
  const tables: WeaponRow[][] = [];
  for (const table of parseWikitables(html)) {
    if (!isWeaponTable(table)) continue;
    const ranged = table.headingPath.some((h) => /^ranged weapons$/i.test(h));
    const crossbow = table.headingPath.some((h) => /^crossbows$/i.test(h));
    const obtainable = !table.headingPath.some((h) => /^unobtainable$/i.test(h));
    const idx = {
      icon: col(table.headers, /^(?:icon|sprite)/i),
      name: col(table.headers, /^name/i),
      rarity: col(table.headers, /^rarity/i),
      effect: col(table.headers, /^effect/i),
      combo: col(table.headers, /^combo/i),
      ammo: col(table.headers, /^ammo/i),
      loc: col(table.headers, /^drop location/i),
    };
    const rows: WeaponRow[] = [];
    for (const row of table.rows) {
      const nameCell = cellAt(row, idx.name);
      const name = d2First(nameCell);
      if (!name) continue;
      const rarity = d2Rarity(cellAt(row, idx.rarity));
      rows.push({
        name,
        pageTitle: d2PageTitle(nameCell, name),
        kind: ranged ? 'ranged' : 'melee',
        rangedType: ranged ? (crossbow ? 'crossbow' : 'bow') : undefined,
        unique: rarity === 'unique',
        rarity,
        effectLines: d2Lines(cellAt(row, idx.effect)),
        combo: numberIn(cellAt(row, idx.combo)?.text ?? ''),
        ammo: numberIn(cellAt(row, idx.ammo)?.text ?? ''),
        sources: sourcesOf(cellAt(row, idx.loc)),
        icon: firstImage(cellAt(row, idx.icon)),
        obtainable,
      });
    }
    tables.push(rows);
  }
  return tables;
}

/** Splits the effect cell into the effect itself and the wiki's "(Although unstated…)" remarks. */
export function splitEffect(lines: readonly string[]): { effect?: string; note?: string } {
  const notes = lines.filter((l) => /^\(.*\)$/.test(l)).map((l) => l.slice(1, -1).trim());
  const effect = lines.filter((l) => !/^\(.*\)$/.test(l)).join(' ');
  return { effect: effect || undefined, note: notes.join(' ') || undefined };
}

export async function parse(ctx: ParseContext): Promise<ParseResult> {
  const list = await parsePageHtml(WEAPON_LIST_PAGE, ctx.client);
  const tables = readWeaponTables(list.html);
  const all = tables.flat();
  const pages = await loadD2Pages(
    ctx,
    all.map((r) => r.pageTitle),
  );

  const drafts: Draft[] = [];
  for (const rows of tables) {
    const pairs = pairWithBase(rows.map((r) => r.unique));
    const idOf = (row: WeaponRow) => `d2:weapons:${slugify(row.name)}`;
    rows.forEach((row, i) => {
      const baseIndex = pairs.get(i);
      const base = baseIndex === undefined ? undefined : rows[baseIndex];
      const page = pages.get(row.pageTitle);
      const { effect, note } = splitEffect(row.effectLines);
      const draft = d2Draft('weapons', row.name, sourceFor(page, list), {
        rarity: row.rarity,
        kind: row.kind,
        weaponType:
          row.kind === 'ranged' ? (row.rangedType ?? 'bow') : meleeFamily((base ?? row).name),
        isUnique: row.unique,
        variantIds: rows
          .filter((_, j) => pairs.get(j) === i)
          .map(idOf)
          .sort(),
        effectValues: effect ? parseD2Effects(effect) : [],
        locations: [],
        obtainable: row.obtainable,
      });
      if (base) draft.baseItemId = idOf(base);
      if (effect) draft.effect = effect;
      if (note) draft.effectNote = note;
      if (row.kind === 'melee' && row.combo) draft.comboLength = row.combo;
      if (row.kind === 'ranged' && row.ammo) draft.ammo = row.ammo;
      const description = infoText(page?.infobox, 'description');
      if (description) draft.description = description;
      const image =
        row.icon ?? (page?.infobox?.image ? `File:${page.infobox.image.trim()}` : undefined);
      if (image) draft._image = image;
      draft._refs = { sources: row.sources };
      drafts.push(draft);
    });
  }

  const unobtainable = all.filter((r) => !r.obtainable).length;
  const melee = all.filter((r) => r.obtainable && r.kind === 'melee').length;
  const ranged = all.filter((r) => r.kind === 'ranged').length;
  return {
    category: 'weapons',
    drafts,
    dropped: [],
    expected: {
      count: all.length,
      note: `${all.length} rows in the melee, bow and crossbow tables (${melee} melee + ${ranged} ranged obtainable, ${unobtainable} unobtainable); the page states no total`,
    },
    notes: [
      `list page revision ${list.revisionId}`,
      `${unobtainable} unobtainable weapons flagged`,
    ],
  };
}
