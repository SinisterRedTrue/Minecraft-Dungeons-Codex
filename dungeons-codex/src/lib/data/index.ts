import 'server-only';
import { createLoaders } from './loaders';

const loaders = createLoaders();

/** The shared loader instance (for helpers that take `Loaders`, e.g. `buildDetailData`). */
export const defaultLoaders = loaders;

export const getAll = loaders.getAll;
export const getBySlug = loaders.getBySlug;
export const getListItems = loaders.getListItems;
export const getCounts = loaders.getCounts;
export const getByIds = loaders.getByIds;
export const getSyncDate = loaders.getSyncDate;
