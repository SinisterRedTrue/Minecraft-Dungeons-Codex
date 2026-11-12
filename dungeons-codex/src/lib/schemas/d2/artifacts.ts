import type { z } from 'zod';
import { entitySchema, openEnum, type SchemaOptions } from '../base';
import { artifactShape } from '../d1/artifacts';

/** §4.4 `D2Artifact`: D1 shape with an *(open)* `artifactType`. */
export const d2ArtifactSchema = (opts: SchemaOptions = {}) =>
  entitySchema({ ...artifactShape('d2'), artifactType: openEnum('artifactType', opts) });

export const D2ArtifactSchema = d2ArtifactSchema();
export type D2Artifact = z.infer<typeof D2ArtifactSchema>;
