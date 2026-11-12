import { z } from 'zod';
import {
  baseShape,
  d1ItemShape,
  effectSchema,
  entitySchema,
  openEnum,
  powerPointSchema,
  type SchemaOptions,
} from '../base';

/** §3.2 `D1Armor`. */
export const d1ArmorSchema = (opts: SchemaOptions = {}) =>
  entitySchema({
    ...baseShape('d1', 'armor'),
    ...d1ItemShape(),
    armorGroup: openEnum('armorGroup', opts),
    damageReduction: z.number().min(0).max(100).optional(),
    effects: z.array(effectSchema),
    baseHealth: z.number().positive().optional(),
    powerTable: z.array(powerPointSchema).optional(),
  });

export const D1ArmorSchema = d1ArmorSchema();
export type D1Armor = z.infer<typeof D1ArmorSchema>;
