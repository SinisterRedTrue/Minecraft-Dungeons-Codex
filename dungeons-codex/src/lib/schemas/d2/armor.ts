import { z } from 'zod';
import { baseShape, effectValueSchema, entitySchema, text } from '../base';

/** §4.2 `D2Armor`. */
export const d2ArmorSchema = () =>
  entitySchema({
    ...baseShape('d2', 'armor'),
    slot: z.enum(['helmet', 'chestplate', 'leggings', 'boots']),
    armorSet: text,
    effects: z.array(text),
    effectValues: z.array(effectValueSchema),
    locations: z.array(text),
  });

export const D2ArmorSchema = d2ArmorSchema();
export type D2Armor = z.infer<typeof D2ArmorSchema>;
