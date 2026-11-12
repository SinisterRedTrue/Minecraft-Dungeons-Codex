import { z } from 'zod';
import type { GameId } from '@/config/games';
import {
  baseShape,
  entityIdSchema,
  entitySchema,
  openEnum,
  text,
  type SchemaOptions,
} from '../base';

/** §3.7 mob shape; D2 reuses it (§4.7). */
export function mobShape<G extends GameId>(game: G, opts: SchemaOptions) {
  return {
    ...baseShape(game, 'mobs'),
    mobType: openEnum('mobType', opts),
    health: z.union([z.number().nonnegative(), text]).optional(),
    attacks: z.array(text),
    locationIds: z.array(entityIdSchema(game)),
    drops: z.array(text),
    variants: z.array(text),
  };
}

export const d1MobSchema = (opts: SchemaOptions = {}) => entitySchema(mobShape('d1', opts));

export const D1MobSchema = d1MobSchema();
export type D1Mob = z.infer<typeof D1MobSchema>;
