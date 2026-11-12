import { z } from 'zod';
import {
  baseShape,
  effectValueSchema,
  entityIdSchema,
  entitySchema,
  openEnum,
  text,
  type SchemaOptions,
} from '../base';

/** §4.1 `D2Weapon`. */
export const d2WeaponSchema = (opts: SchemaOptions = {}) => {
  const id = entityIdSchema('d2');
  return entitySchema({
    ...baseShape('d2', 'weapons'),
    kind: z.enum(['melee', 'ranged']),
    weaponType: openEnum('weaponType', opts),
    isUnique: z.boolean(),
    baseItemId: id.optional(),
    variantIds: z.array(id),
    effect: text.optional(),
    effectNote: text.optional(),
    effectValues: z.array(effectValueSchema),
    comboLength: z.number().int().positive().optional(),
    ammo: z.number().int().positive().optional(),
    locations: z.array(text),
    obtainable: z.boolean(),
  });
};

export const D2WeaponSchema = d2WeaponSchema();
export type D2Weapon = z.infer<typeof D2WeaponSchema>;
