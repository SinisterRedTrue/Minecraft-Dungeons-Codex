import { z } from 'zod';
import { baseShape, entityIdSchema, entitySchema, text } from '../base';

const count = z.number().int().nonnegative();

/** §3.5 `D1Dlc`. `contentCounts` is computed at sync time. */
export const d1DlcSchema = () =>
  entitySchema({
    ...baseShape('d1', 'dlcs'),
    releaseDate: z.iso.date().optional(),
    order: z.number().int().positive(),
    summary: text,
    locationIds: z.array(entityIdSchema('d1')),
    contentCounts: z.strictObject({
      weapons: count,
      armor: count,
      artifacts: count,
      mobs: count,
      enchantments: count,
    }),
  });

export const D1DlcSchema = d1DlcSchema();
export type D1Dlc = z.infer<typeof D1DlcSchema>;
