/**
 * Everything one detail page needs, gathered at build time from the loaders: the entity's own
 * references resolved to names and links, stat bars, infobox rows, the Set / DLC-contents /
 * story-order extras, prev/next and the related cards. Components receive this plain object, so
 * they never touch the loaders and can be tested with hand-made data.
 */
import 'server-only';
import { cardModel, type CardModel } from '@/components/entity/format';
import {
  DLC_CONTENT_CATEGORIES,
  HEADER_CHIPS,
  INFOBOX_ROWS,
  RELATED_LIMIT,
  STAT_ROWS,
} from '@/config/detail';
import { getCategoryConfig } from '@/config/categories';
import type { CategorySlug, GameId } from '@/config/games';
import type { Loaders } from '@/lib/data/loaders';
import { deriveListFields } from '@/lib/filters/derive';
import { buildLabels, labelFields } from '@/lib/filters/labels';
import type { LabelMap } from '@/lib/filters/options';
import type { Entity, EntityListItem } from '@/lib/schemas';
import {
  buildChips,
  buildInfobox,
  buildStatusBadges,
  type HeaderBadge,
  type InfoRow,
} from './infobox';
import { collectIds, refOf, slugIds, type EntityRef, type LinkValue, type Refs } from './refs';
import { buildStats, computeMaxima, type StatItem } from './stats';

export interface DlcContentGroup {
  category: string;
  label: string;
  items: EntityRef[];
}

export interface QuestOrder {
  position: number;
  total: number;
  previous?: EntityRef;
  next?: EntityRef;
}

export interface RelatedCard {
  item: EntityListItem;
  model: CardModel;
}

export interface DetailData {
  game: GameId;
  category: string;
  categoryLabel: string;
  entity: Entity;
  /** The entity plus its derived fields (`totalCost`, `damageReduction` …): what rows read. */
  source: Record<string, unknown>;
  refs: Refs;
  labels: LabelMap;
  stats: StatItem[];
  infobox: InfoRow[];
  chips: LinkValue[];
  badges: HeaderBadge[];
  /** D2 armor: every piece of the set in slot order (includes this one). */
  setPieces: EntityRef[];
  /** D1 DLCs: the entities whose `dlc` is this DLC, grouped by category. */
  dlcContents: DlcContentGroup[];
  /** D2 core quests: the story order neighbours. */
  questOrder?: QuestOrder;
  prev?: EntityRef;
  next?: EntityRef;
  related: RelatedCard[];
}

const SLOT_RANK = ['helmet', 'chestplate', 'leggings', 'boots'];

const maximaCache = new WeakMap<Loaders, Map<string, Record<string, number>>>();

function categoryMaxima(loaders: Loaders, game: GameId, category: string): Record<string, number> {
  let perLoaders = maximaCache.get(loaders);
  if (!perLoaders) {
    perLoaders = new Map();
    maximaCache.set(loaders, perLoaders);
  }
  const key = `${game}/${category}`;
  let maxima = perLoaders.get(key);
  if (!maxima) {
    const specs = (STAT_ROWS[game] as Record<string, (typeof STAT_ROWS)['d1']['weapons']>)[
      category
    ];
    maxima = computeMaxima(specs ?? [], loaders.getListItems(game, category as never));
    perLoaders.set(key, maxima);
  }
  return maxima;
}

function bySlotThenName(a: Entity, b: Entity): number {
  const slot = (e: Entity) => SLOT_RANK.indexOf((e as unknown as { slot?: string }).slot ?? '');
  return slot(a) - slot(b) || a.name.localeCompare(b.name);
}

export function buildDetailData(loaders: Loaders, entity: Entity): DetailData {
  const { game, category } = entity;
  const config = getCategoryConfig(game, category);
  if (!config) throw new Error(`No category config for ${game}/${category}`);
  const record = entity as unknown as Record<string, unknown>;
  const all = loaders.getAll(game, category as never) as unknown as Entity[];

  // ── extras that need other entities ────────────────────────────────────────────────────
  const setPieces =
    game === 'd2' && category === 'armor'
      ? all
          .filter((e) => (e as { armorSet?: string }).armorSet === record.armorSet)
          .sort(bySlotThenName)
      : [];

  const dlcContents: { category: string; label: string; entities: Entity[] }[] = [];
  if (game === 'd1' && category === 'dlcs') {
    for (const contentCategory of DLC_CONTENT_CATEGORIES) {
      const members = (loaders.getAll(game, contentCategory) as unknown as Entity[]).filter(
        (e) => e.dlc === entity.slug,
      );
      if (members.length === 0) continue;
      dlcContents.push({
        category: contentCategory,
        label: getCategoryConfig(game, contentCategory)?.label ?? contentCategory,
        entities: members,
      });
    }
  }

  let questOrder: { position: number; total: number; previous?: Entity; next?: Entity } | undefined;
  if (game === 'd2' && category === 'quests' && record.questType === 'core') {
    const core = all
      .filter((e) => (e as { questType?: string }).questType === 'core')
      .sort(
        (a, b) =>
          ((a as { order?: number }).order ?? Infinity) -
          ((b as { order?: number }).order ?? Infinity),
      );
    const index = core.findIndex((e) => e.id === entity.id);
    if (index >= 0) {
      const previous = core[index - 1];
      const next = core[index + 1];
      questOrder = {
        position: index + 1,
        total: core.length,
        ...(previous ? { previous } : {}),
        ...(next ? { next } : {}),
      };
    }
  }

  const index = all.findIndex((e) => e.id === entity.id);
  const prevEntity = index > 0 ? all[index - 1] : undefined;
  const nextEntity = index >= 0 ? all[index + 1] : undefined;
  const relatedEntities = loaders.getRelated(entity, RELATED_LIMIT);

  // ── one lookup for every id the page links to ──────────────────────────────────────────
  const ids = collectIds(entity);
  for (const id of slugIds(entity)) ids.add(id);
  for (const group of dlcContents) for (const e of group.entities) ids.add(e.id);
  for (const e of setPieces) ids.add(e.id);
  if (questOrder?.previous) ids.add(questOrder.previous.id);
  if (questOrder?.next) ids.add(questOrder.next.id);
  const refs: Record<string, EntityRef> = {};
  for (const found of loaders.getByIds([...ids])) refs[found.id] = refOf(found);

  // ── related cards, with the labels their meta lines need ───────────────────────────────
  const relatedItems = loaders.toListItems(relatedEntities);
  const cardFields = [...config.cardMeta, ...config.cardStats.map((s) => s.field)];
  const relatedLabels = buildLabels({
    game,
    category,
    items: relatedItems,
    fields: labelFields([], cardFields),
    lookup: (id) => loaders.getByIds([id])[0]?.name,
  });
  const related = relatedItems.map((item) => ({
    item,
    model: cardModel(item, config.cardStats, config.cardMeta, relatedLabels),
  }));

  // ── stats, infobox, header ─────────────────────────────────────────────────────────────
  const source: Record<string, unknown> = {
    ...record,
    ...deriveListFields(game, category, record),
  };
  const ctx = { game, category, refs, selfId: entity.id };
  const statSpecs =
    (STAT_ROWS[game] as Record<string, (typeof STAT_ROWS)['d1']['weapons']>)[category] ?? [];
  const infoSpecs =
    (INFOBOX_ROWS[game] as Record<string, (typeof INFOBOX_ROWS)['d1']['weapons']>)[category] ?? [];
  const chipSpecs =
    (HEADER_CHIPS[game] as Record<string, (typeof HEADER_CHIPS)['d1']['weapons']>)[category] ?? [];

  return {
    game,
    category,
    categoryLabel: config.label,
    entity,
    source,
    refs,
    labels: relatedLabels,
    stats: buildStats(statSpecs, source, categoryMaxima(loaders, game, category)),
    infobox: buildInfobox(infoSpecs, source, ctx),
    chips: buildChips(chipSpecs, source, ctx),
    badges: buildStatusBadges(source, ctx),
    setPieces: setPieces.map(refOf),
    dlcContents: dlcContents.map((g) => ({
      category: g.category,
      label: g.label,
      items: g.entities.map(refOf),
    })),
    ...(questOrder
      ? {
          questOrder: {
            position: questOrder.position,
            total: questOrder.total,
            ...(questOrder.previous ? { previous: refOf(questOrder.previous) } : {}),
            ...(questOrder.next ? { next: refOf(questOrder.next) } : {}),
          },
        }
      : {}),
    ...(prevEntity ? { prev: refOf(prevEntity) } : {}),
    ...(nextEntity ? { next: refOf(nextEntity) } : {}),
    related,
  };
}

export type { CategorySlug };
