/**
 * Shared building blocks for every entity schema. Normative source:
 * `[ RoadMap ]/[ Plans ]/03-CONTENT-MODEL.md` §1. This module is imported by both the app
 * and `scripts/`, so it must stay free of Node APIs.
 */
import { z } from 'zod';
import type { AnyCategorySlug, GameId } from '@/config/games';
import { GAMES } from '@/config/games';

/**
 * Allowed values for the *(open)* enums, keyed by field name (`weaponType`, `mobType`, …).
 * Loaded by the scripts from `data/vocab/{game}/enums.json`; when a field has no entry, any
 * non-empty string is accepted.
 */
export type Vocab = Readonly<Partial<Record<string, readonly string[]>>>;

export interface SchemaOptions {
  vocab?: Vocab;
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z.string().regex(SLUG_RE, 'must be kebab-case');

/** A non-empty string; free text such as names, descriptions and unresolved references. */
export const text = z.string().trim().min(1);

/** An *(open)* enum: any non-empty string, or one of the vocab values when the vocab lists them. */
export function openEnum(field: string, opts: SchemaOptions = {}) {
  const allowed = opts.vocab?.[field];
  if (!allowed) return text;
  return text.refine((value) => allowed.includes(value), {
    message: `not in data/vocab enums.${field}`,
  });
}

/** `${game}:${category}:${slug}` restricted to one game's categories. */
export function entityIdSchema(game: GameId) {
  const categories = (GAMES[game].categories as readonly string[]).join('|');
  return z.string().regex(new RegExp(`^${game}:(?:${categories}):[a-z0-9]+(?:-[a-z0-9]+)*$`), {
    message: `must be a ${game} entity id`,
  });
}

export const D1_RARITIES = ['common', 'rare', 'unique'] as const;
export const D2_RARITIES = ['common', 'rare', 'special', 'unique'] as const;

export const rarityFor = (game: GameId) => z.enum(game === 'd1' ? D1_RARITIES : D2_RARITIES);

export type D1Rarity = (typeof D1_RARITIES)[number];
export type D2Rarity = (typeof D2_RARITIES)[number];
export type Rarity = D1Rarity | D2Rarity;

export const imageSchema = z.strictObject({
  src: z.string().regex(/^\/images\/(?:d1|d2)\/[a-z]+\/[a-z0-9-]+\.webp$/),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: text,
});

export const sourceSchema = z.strictObject({
  title: text,
  url: z.url(),
  revisionId: z.number().int().nonnegative(),
  fetchedAt: z.iso.datetime(),
});

export const overrideNoteSchema = z.strictObject({
  field: text,
  reason: text,
  sourceUrl: z.url(),
});

/** One row of a documented power table: damage (weapons) or health (armor) at a power level. */
export const powerPointSchema = z.strictObject({
  power: z.number().nonnegative(),
  min: z.number().nonnegative(),
  max: z.number().nonnegative(),
});

export const effectUnitSchema = z.enum(['%', 's', 'flat']);

/** A labelled number parsed from text, e.g. `+30% Movement Speed`. */
export const effectSchema = z.strictObject({
  label: text,
  value: z.number().optional(),
  unit: effectUnitSchema.optional(),
});

/** Like {@link effectSchema} but the number is required (D2 `effectValues`). */
export const effectValueSchema = z.strictObject({
  label: text,
  value: z.number(),
  unit: effectUnitSchema,
});

/** The fields every entity has (§1), for one game and category. */
export function baseShape<G extends GameId, C extends AnyCategorySlug>(game: G, category: C) {
  return {
    id: z.string(),
    slug: slugSchema,
    game: z.literal(game),
    category: z.literal(category),
    name: text,
    description: text.optional(),
    image: imageSchema.optional(),
    rarity: rarityFor(game).optional(),
    dlc: text.optional(),
    tags: z.array(slugSchema),
    related: z.array(entityIdSchema(game)),
    source: sourceSchema,
    quality: z.enum(['verified', 'partial']),
    overrides: z.array(overrideNoteSchema).optional(),
  };
}

/**
 * Wraps a full shape into a strict object schema and checks the invariants that tie fields
 * together: the id is derived from game/category/slug, and the image path uses the slug.
 */
export function entitySchema<S extends z.ZodRawShape>(shape: S) {
  return z.strictObject(shape).superRefine((raw, ctx) => {
    const entity = raw as unknown as {
      id: string;
      game: string;
      category: string;
      slug: string;
      image?: { src: string };
    };
    const expectedId = `${entity.game}:${entity.category}:${entity.slug}`;
    if (entity.id !== expectedId) {
      ctx.addIssue({ code: 'custom', path: ['id'], message: `must be "${expectedId}"` });
    }
    const expectedSrc = `/images/${entity.game}/${entity.category}/${entity.slug}.webp`;
    if (entity.image && entity.image.src !== expectedSrc) {
      ctx.addIssue({ code: 'custom', path: ['image', 'src'], message: `must be "${expectedSrc}"` });
    }
  });
}

/** The item fields D1 weapons and armor share (§3.1/§3.2). */
export function d1ItemShape() {
  const id = entityIdSchema('d1');
  return {
    isUnique: z.boolean(),
    baseItemId: id.optional(),
    variantIds: z.array(id),
    properties: z.array(text),
    builtInEnchantments: z.array(
      z.strictObject({
        enchantmentId: id,
        level: z.number().int().min(1).max(3).optional(),
      }),
    ),
    acceptsSoulEnchantments: z.boolean(),
    locations: z.array(text),
    isSeasonal: z.boolean(),
  };
}
