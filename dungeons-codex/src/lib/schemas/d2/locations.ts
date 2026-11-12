import type { z } from 'zod';
import { entitySchema, openEnum, type SchemaOptions } from '../base';
import { locationShape } from '../d1/locations';

/** §4.8 `D2Location`: D1 shape with an *(open)* `locationType`. */
export const d2LocationSchema = (opts: SchemaOptions = {}) =>
  entitySchema({ ...locationShape('d2'), locationType: openEnum('locationType', opts) });

export const D2LocationSchema = d2LocationSchema();
export type D2Location = z.infer<typeof D2LocationSchema>;
