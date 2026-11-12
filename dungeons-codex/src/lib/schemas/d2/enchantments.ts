import { z } from 'zod';
import { baseShape, entitySchema, text } from '../base';

/** §4.3 `D2Enchantment`: the D2 list has no tier/cost/gilded/stackable columns, so it is not the D1 shape. */
export const d2EnchantmentSchema = () =>
  entitySchema({
    ...baseShape('d2', 'enchantments'),
    appliesTo: z.array(z.enum(['melee', 'ranged', 'armor'])).min(1),
    restriction: text.optional(),
    levels: z.array(
      z.strictObject({
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text,
        value: z.number().optional(),
        unit: text.optional(),
      }),
    ),
    obtaining: z.array(text),
  });

export const D2EnchantmentSchema = d2EnchantmentSchema();
export type D2Enchantment = z.infer<typeof D2EnchantmentSchema>;
