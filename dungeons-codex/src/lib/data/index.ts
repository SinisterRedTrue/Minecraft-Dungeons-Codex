import 'server-only';
import { createLoaders } from './loaders';

export { createLoaders, defaultDataDir, type Loaders } from './loaders';

const loaders = createLoaders();

export const getAll = loaders.getAll;
export const getBySlug = loaders.getBySlug;
export const getListItems = loaders.getListItems;
export const getCounts = loaders.getCounts;
export const getRelated = loaders.getRelated;
export const getByIds = loaders.getByIds;
export const getSyncDate = loaders.getSyncDate;
