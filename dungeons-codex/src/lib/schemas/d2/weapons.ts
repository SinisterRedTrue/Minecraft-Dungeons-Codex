import { z } from 'zod';
import {
  baseShape,
  effectValueSchema,
  entitySchema,
  openEnum,
  text,
  type SchemaOptions,
} from '../base';

/** §4.1 `D2Weapon`. */
export const d2WeaponSchema = (opts: SchemaOptions = {}) =>
  entitySchema({
    ...baseShape('d2', 'weapons'),
    kind: z.enum(['melee', 'ranged']),
    weaponType: openEnum('weaponType', opts),
    effect: text,
    effectValues: z.array(effectValueSchema),
    comboLength: z.number().int().positive().optional(),
    ammo: text.optional(),
    locations: z.array(text),
    obtainable: z.boolean(),
  });

export const D2WeaponSchema = d2WeaponSchema();
export type D2Weapon = z.infer<typeof D2WeaponSchema>;
