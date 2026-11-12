import { z } from 'zod';
import { baseShape, entitySchema, openEnum, text, type SchemaOptions } from '../base';

export const D1_COSMETIC_TYPES = ['cape', 'pet', 'emote', 'flare', 'skin'] as const;

/** §3.6 `D1Cosmetic`. */
export const d1CosmeticSchema = (opts: SchemaOptions = {}) =>
  entitySchema({
    ...baseShape('d1', 'cosmetics'),
    cosmeticType: z.enum(D1_COSMETIC_TYPES),
    obtainedFrom: openEnum('obtainedFrom', opts),
    howToObtain: text.optional(),
    season: text.optional(),
  });

export const D1CosmeticSchema = d1CosmeticSchema();
export type D1Cosmetic = z.infer<typeof D1CosmeticSchema>;
