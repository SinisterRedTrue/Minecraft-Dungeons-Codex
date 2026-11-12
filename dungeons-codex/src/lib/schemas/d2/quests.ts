import { z } from 'zod';
import { baseShape, entityIdSchema, entitySchema, text } from '../base';

/** §4.6 `D2Quest`. */
export const d2QuestSchema = () =>
  entitySchema({
    ...baseShape('d2', 'quests'),
    questType: z.enum(['core', 'side']),
    order: z.number().int().positive().optional(),
    locationIds: z.array(entityIdSchema('d2')),
    areas: z.array(text),
    rewards: z.array(
      z.strictObject({
        when: z.enum(['first', 'subsequent', 'always']),
        xp: z.number().nonnegative().optional(),
        items: z.array(text),
        randomFrom: z
          .array(
            z.strictObject({
              text,
              count: z.number().int().positive(),
              from: z.array(text),
            }),
          )
          .optional(),
      }),
    ),
    dlcExclusive: z.boolean(),
  });

export const D2QuestSchema = d2QuestSchema();
export type D2Quest = z.infer<typeof D2QuestSchema>;
