import { z } from 'zod';
import {
  baseShape,
  entityIdSchema,
  entitySchema,
  openEnum,
  text,
  type SchemaOptions,
} from '../base';

/** §4.8 `D2Location`: a main area with its stations and sub-areas as text. */
export const d2LocationSchema = (opts: SchemaOptions = {}) => {
  const id = entityIdSchema('d2');
  return entitySchema({
    ...baseShape('d2', 'locations'),
    locationType: openEnum('locationType', opts),
    region: text.optional(),
    stations: z.array(text),
    subAreas: z.array(text),
    mobIds: z.array(id),
    itemIds: z.array(id),
    questIds: z.array(id),
  });
};

export const D2LocationSchema = d2LocationSchema();
export type D2Location = z.infer<typeof D2LocationSchema>;
