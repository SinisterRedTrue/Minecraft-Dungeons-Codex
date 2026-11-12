import { z } from 'zod';
import { baseShape, entitySchema, text } from '../base';

/** §4.4 `D2Artifact`: the wiki gives no artifact types or property bullets, only costs. */
export const d2ArtifactSchema = () =>
  entitySchema({
    ...baseShape('d2', 'artifacts'),
    soulCost: z.number().nonnegative(),
    requiresSouls: z.boolean(),
    cooldownSeconds: z.number().nonnegative().optional(),
    locations: z.array(text),
  });

export const D2ArtifactSchema = d2ArtifactSchema();
export type D2Artifact = z.infer<typeof D2ArtifactSchema>;
