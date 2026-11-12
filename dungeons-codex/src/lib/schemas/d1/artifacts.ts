import { z } from 'zod';
import type { GameId } from '@/config/games';
import { baseShape, entitySchema, text } from '../base';

export const D1_ARTIFACT_TYPES = [
  'damaging',
  'status',
  'quiver',
  'summoning',
  'agility',
  'defensive',
] as const;

/** §3.4 artifact fields minus `artifactType`, which is closed in D1 and open in D2 (§4.4). */
export function artifactShape<G extends GameId>(game: G) {
  return {
    ...baseShape(game, 'artifacts'),
    cooldownSeconds: z.number().nonnegative().optional(),
    requiresSouls: z.boolean(),
    properties: z.array(text),
    locations: z.array(text),
    internalId: text.optional(),
  };
}

export const d1ArtifactSchema = () =>
  entitySchema({ ...artifactShape('d1'), artifactType: z.enum(D1_ARTIFACT_TYPES) });

export const D1ArtifactSchema = d1ArtifactSchema();
export type D1Artifact = z.infer<typeof D1ArtifactSchema>;
