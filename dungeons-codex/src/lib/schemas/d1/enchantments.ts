import { z } from 'zod';
import type { GameId } from '@/config/games';
import { baseShape, entityIdSchema, entitySchema, text } from '../base';

/** §3.3 enchantment shape; D2 reuses it (§4.3) until Prompt 05 records differences. */
export function enchantmentShape<G extends GameId>(game: G) {
  return {
    ...baseShape(game, 'enchantments'),
    appliesTo: z.array(z.enum(['melee', 'ranged', 'armor'])).min(1),
    tier: z.enum(['common', 'powerful']).optional(),
    isGilded: z.boolean(),
    gildedDescription: text.optional(),
    levels: z.array(
      z.strictObject({
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text,
        value: z.number().optional(),
        unit: text.optional(),
      }),
    ),
    pointCost: z.tuple([z.number().int(), z.number().int(), z.number().int()]).optional(),
    stackable: z.boolean(),
    mobObtainable: z.boolean(),
    builtInto: z.array(entityIdSchema(game)),
    section: z.enum(['standard', 'exclusive', 'mob-exclusive']),
  };
}

export const d1EnchantmentSchema = () => entitySchema(enchantmentShape('d1'));

export const D1EnchantmentSchema = d1EnchantmentSchema();
export type D1Enchantment = z.infer<typeof D1EnchantmentSchema>;
