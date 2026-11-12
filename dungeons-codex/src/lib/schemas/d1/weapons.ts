import { z } from 'zod';
import { baseShape, d1ItemShape, entitySchema, openEnum, text, type SchemaOptions } from '../base';

/** §3.1 `D1Weapon`. `stats` keys come from `scripts/wiki/statMap.ts`. */
export const d1WeaponSchema = (opts: SchemaOptions = {}) =>
  entitySchema({
    ...baseShape('d1', 'weapons'),
    ...d1ItemShape(),
    kind: z.enum(['melee', 'ranged']),
    weaponType: openEnum('weaponType', opts),
    stats: z
      .object({
        damage: z.number().optional(),
        speed: z.number().optional(),
        area: z.number().optional(),
      })
      .catchall(z.number().optional())
      .optional(),
    comboLength: z.number().int().positive().optional(),
    ammo: text.optional(),
    damageType: text.optional(),
    powerTable: z
      .array(
        z.strictObject({
          power: z.number().nonnegative(),
          min: z.number().nonnegative(),
          max: z.number().nonnegative(),
        }),
      )
      .optional(),
  });

export const D1WeaponSchema = d1WeaponSchema();
export type D1Weapon = z.infer<typeof D1WeaponSchema>;
