import { z } from 'zod';
import { ENTITY_ID } from './store';

const favoritesSchema = z.array(z.string().regex(ENTITY_ID));

/**
 * The file written by Export and read by Import. A bare `string[]` is accepted too. Kept apart
 * from the store so Zod only loads on the Favorites page.
 */
export const backupSchema = z.union([
  favoritesSchema,
  z.object({ version: z.literal(1), favorites: favoritesSchema }),
]);
