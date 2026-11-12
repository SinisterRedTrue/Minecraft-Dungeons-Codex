import { z } from 'zod';
import type { GameId } from '@/config/games';
import { baseShape, entityIdSchema, entitySchema, text } from '../base';

export const D1_LOCATION_TYPES = [
  'mission',
  'secret',
  'dlc-mission',
  'tower',
  'camp',
  'hub',
  'other',
] as const;

/** §3.8 location fields minus `locationType`, which is closed in D1 and open in D2 (§4.8). */
export function locationShape<G extends GameId>(game: G) {
  const id = entityIdSchema(game);
  return {
    ...baseShape(game, 'locations'),
    region: text.optional(),
    mobIds: z.array(id),
    itemIds: z.array(id),
    secretOf: id.optional(),
    recommendedPower: text.optional(),
  };
}

export const d1LocationSchema = () =>
  entitySchema({ ...locationShape('d1'), locationType: z.enum(D1_LOCATION_TYPES) });

export const D1LocationSchema = d1LocationSchema();
export type D1Location = z.infer<typeof D1LocationSchema>;
