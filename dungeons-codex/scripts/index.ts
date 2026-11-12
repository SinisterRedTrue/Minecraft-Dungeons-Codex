/**
 * `npm run data:index`: builds the Codex Search index for each game from `data/generated`.
 * Writes `data/generated/{game}/search-index.json` and a copy at `public/search/{game}.json`
 * (fetched lazily by the palette). It reads only generated JSON, so it runs offline, and it is
 * the `prebuild` step so the index can never be stale. It also writes the Power Forge
 * enchantment catalogs to `public/forge/{game}.json` (`lib/forge-catalog.ts`).
 */
import { buildForgeCatalogs } from './lib/forge-catalog';
import { buildAll } from './lib/search-index';

for (const { game, entries, gzip } of buildAll()) {
  console.log(`data:index: ${game} — ${entries} entries, ${(gzip / 1024).toFixed(1)} kB gzip`);
}

for (const { game, entries, gzip } of buildForgeCatalogs()) {
  console.log(
    `data:index: ${game} forge catalog — ${entries} enchantments, ${(gzip / 1024).toFixed(1)} kB gzip`,
  );
}
