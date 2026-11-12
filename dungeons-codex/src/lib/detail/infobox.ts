/**
 * Infobox rows and header chips: pure functions over an entity (plus its derived fields) and the
 * resolved refs, so they are unit-tested without rendering anything.
 */
import { formatField } from '@/components/entity/format';
import type { ChipSpec, InfoRowSpec } from '@/config/detail';
import type { FieldFormat } from '@/config/display/types';
import type { GameId } from '@/config/games';
import { getValues } from '@/lib/filters/path';
import { toLink, slugLink, type LinkValue, type Refs } from './refs';

export interface InfoRow {
  label: string;
  /** One entry per value; entries with an `href` are links. */
  values: LinkValue[];
}

type Source = Readonly<Record<string, unknown>>;

interface Ctx {
  game: GameId;
  category: string;
  refs: Refs;
  /** The page's own entity id: a value that names the page itself is shown, not linked. */
  selfId?: string;
}

const unlinkSelf = (link: LinkValue, ctx: Ctx): LinkValue =>
  link.ref !== undefined && link.ref.id === ctx.selfId ? { label: link.label } : link;

function valuesOf(spec: InfoRowSpec | ChipSpec, source: Source, ctx: Ctx): LinkValue[] {
  const raw = getValues(source, spec.field);
  if (raw.length === 0) return [];
  const kind = spec.refKind;
  if (kind) {
    return raw.map((value) =>
      unlinkSelf(slugLink(ctx.game, ctx.category, kind, value, ctx.refs), ctx),
    );
  }
  return raw.map((value) => unlinkSelf(toLink(value, ctx.refs), ctx));
}

/** The rows of a category's infobox that have a value. */
export function buildInfobox(specs: readonly InfoRowSpec[], source: Source, ctx: Ctx): InfoRow[] {
  const rows: InfoRow[] = [];
  for (const spec of specs) {
    const values = rowValues(spec, source, ctx);
    if (values.length > 0) rows.push({ label: spec.label, values });
  }
  return rows;
}

function rowValues(spec: InfoRowSpec, source: Source, ctx: Ctx): LinkValue[] {
  switch (spec.format) {
    case 'ref':
    case 'refs':
      return valuesOf(spec, source, ctx);
    case 'join': {
      const raw = getValues(source, spec.field);
      return raw.length > 0 ? [{ label: raw.map(String).join(' / ') }] : [];
    }
    case 'size': {
      const count = getValues(source, spec.field).length;
      if (count === 0) return [];
      const [one, many] = spec.noun ?? ['item', 'items'];
      return [{ label: `${count} ${count === 1 ? one : many}` }];
    }
    default: {
      const text = formatField(source, spec.field, spec.format as FieldFormat);
      return text === undefined || text === '' ? [] : [{ label: text }];
    }
  }
}

/** The chips under the entity name (type, group …), already spelled out and linked where possible. */
export function buildChips(specs: readonly ChipSpec[], source: Source, ctx: Ctx): LinkValue[] {
  const chips: LinkValue[] = [];
  for (const spec of specs) {
    if (spec.refKind) {
      chips.push(...valuesOf(spec, source, ctx));
    } else {
      const text = formatField(source, spec.field, 'label');
      if (text) chips.push({ label: text });
    }
  }
  return chips;
}

type HeaderBadgeVariant = 'seasonal' | 'unobtainable' | 'soul' | 'dlc' | 'special';

export interface HeaderBadge {
  label: string;
  variant: HeaderBadgeVariant;
  href?: string;
}

/**
 * Status badges next to the rarity badge: DLC, Seasonal, Unobtainable, Uses souls, Secret. Each is
 * spelled out as text, never colour alone.
 */
export function buildStatusBadges(source: Source, ctx: Ctx): HeaderBadge[] {
  const badges: HeaderBadge[] = [];
  const dlc = source.dlc;
  if (typeof dlc === 'string' && dlc !== '') {
    const link = unlinkSelf(slugLink(ctx.game, ctx.category, 'dlcs', dlc, ctx.refs), ctx);
    badges.push({
      label: link.label,
      variant: 'dlc',
      ...(link.href ? { href: link.href } : {}),
    });
  }
  if (source.isSeasonal === true) badges.push({ label: 'Seasonal', variant: 'seasonal' });
  if (source.obtainable === false) badges.push({ label: 'Unobtainable', variant: 'unobtainable' });
  if (source.requiresSouls === true) badges.push({ label: 'Uses souls', variant: 'soul' });
  if (source.isSecret === true) badges.push({ label: 'Secret', variant: 'special' });
  return badges;
}
