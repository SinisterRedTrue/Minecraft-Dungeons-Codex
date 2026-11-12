/**
 * The Build model (v1) and its wire form (`[ Plans ]/07-FEATURES-SPEC.md` §5):
 * `{ v: 1, g, n?, p?, t?, s: { slotKey: [itemSlug, [[enchantmentSlug, tier], …], tier?] } }`.
 * `n` is the build name, `p` the power level (D1), `t` the notes, and the optional third slot
 * element the tier of a talisman. The UI works with {@link Build}; only the codec and the
 * storage see the wire form.
 */
import { z } from 'zod';
import { GAME_IDS, type GameId } from '@/config/games';
import { MAX_POWER } from '@/lib/forge/codec';
import type { Pick, Tier } from '@/lib/forge/enchantments';
import { slugSchema } from '@/lib/schemas/base';

export const MAX_NAME = 40;
export const MAX_NOTES = 280;
/** Most slots a build can fill (Dungeons II: 12). */
export const MAX_SLOTS = 12;
/** Most enchantments one slot holds (Dungeons: 3). */
export const MAX_SLOT_PICKS = 3;

const tierSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

const slotWire = z.tuple([
  slugSchema,
  z.array(z.tuple([slugSchema, tierSchema])).max(MAX_SLOT_PICKS),
  tierSchema.optional(),
]);

export const wireSchema = z.strictObject({
  v: z.literal(1),
  g: z.enum(GAME_IDS),
  n: z.string().max(MAX_NAME).optional(),
  p: z.number().int().min(1).max(MAX_POWER).optional(),
  t: z.string().max(MAX_NOTES).optional(),
  s: z
    .record(z.string().min(1).max(20), slotWire)
    .refine((slots) => Object.keys(slots).length <= MAX_SLOTS),
});

export type Wire = z.infer<typeof wireSchema>;

/** What one slot holds. */
export interface SlotChoice {
  /** Slug of the weapon, armor piece, artifact or talisman. */
  slug: string;
  /** Enchantments in slot order (gear only). */
  picks: Pick[];
  /** Talismans only. */
  tier?: Tier;
}

export interface Build {
  game: GameId;
  name?: string;
  /** D1 power level. */
  power?: number;
  notes?: string;
  slots: Readonly<Record<string, SlotChoice>>;
}

export const emptyBuild = (game: GameId): Build => ({ game, slots: {} });

/** A build with nothing in it (name and power alone do not count as content to share). */
export const isEmptyBuild = (build: Build): boolean => Object.keys(build.slots).length === 0;

export function toWire(build: Build): Wire {
  const s: Wire['s'] = {};
  for (const [key, choice] of Object.entries(build.slots)) {
    s[key] =
      choice.tier === undefined
        ? [choice.slug, choice.picks.map((p) => [p.slug, p.tier])]
        : [choice.slug, choice.picks.map((p) => [p.slug, p.tier]), choice.tier];
  }
  return {
    v: 1,
    g: build.game,
    ...(build.name ? { n: build.name } : {}),
    ...(build.power === undefined ? {} : { p: build.power }),
    ...(build.notes ? { t: build.notes } : {}),
    s,
  };
}

/** The structural reading of a wire object; nothing is checked against the game data yet. */
export function fromWire(wire: Wire): Build {
  const slots: Record<string, SlotChoice> = {};
  for (const [key, [slug, picks, tier]] of Object.entries(wire.s)) {
    slots[key] = {
      slug,
      picks: picks.map(([pickSlug, pickTier]) => ({ slug: pickSlug, tier: pickTier })),
      ...(tier === undefined ? {} : { tier }),
    };
  }
  return {
    game: wire.g,
    ...(wire.n ? { name: wire.n } : {}),
    ...(wire.p === undefined ? {} : { power: wire.p }),
    ...(wire.t ? { notes: wire.t } : {}),
    slots,
  };
}
