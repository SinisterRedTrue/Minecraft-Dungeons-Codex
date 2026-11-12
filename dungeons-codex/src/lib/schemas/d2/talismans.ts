import { z } from 'zod';
import { baseShape, entitySchema, text } from '../base';

export const D2_BOOST_TYPES = [
  'ranged',
  'movement',
  'drops',
  'artifact',
  'melee',
  'health',
  'pet',
  'damage',
  'souls',
  'experience',
] as const;

const tier = <T extends 1 | 2 | 3>(n: T) =>
  z.strictObject({
    tier: z.literal(n),
    text,
    value: z.number().optional(),
    unit: text.optional(),
  });

/** §4.5 `D2Talisman`. */
export const d2TalismanSchema = () =>
  entitySchema({
    ...baseShape('d2', 'talismans'),
    passiveBonus: text,
    boostType: z.enum(D2_BOOST_TYPES),
    isSecret: z.boolean(),
    tiers: z.tuple([tier(1), tier(2), tier(3)]),
    sourceType: z.enum(['quest-reward', 'secret-chest', 'boss-drop', 'other']),
    locations: z.array(text),
  });

export const D2TalismanSchema = d2TalismanSchema();
export type D2Talisman = z.infer<typeof D2TalismanSchema>;
