import type { z } from 'zod';
import { entitySchema, type SchemaOptions } from '../base';
import { mobShape } from '../d1/mobs';

/** §4.7 `D2Mob`: D1 shape with an *(open)* `mobType`. */
export const d2MobSchema = (opts: SchemaOptions = {}) => entitySchema(mobShape('d2', opts));

export const D2MobSchema = d2MobSchema();
export type D2Mob = z.infer<typeof D2MobSchema>;
