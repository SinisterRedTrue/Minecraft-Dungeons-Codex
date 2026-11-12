# Prompt 03: Data Core (schemas, wiki client, parsing toolkit)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 02.
**Read first:** `[ Plans ]/03-CONTENT-MODEL.md`, `04-DATA-PIPELINE.md`, `09-LEGAL-AND-ATTRIBUTION.md` (scraping etiquette).

## Goal
All Zod schemas exist. A polite, cached, retrying wiki API client exists. Table/template/text parsing helpers are proven on real saved wiki responses. The `Infobox Dungeons item` stat mapping is researched and documented. Data loaders for the app exist (working on fixture data).

## Tasks
1. **Schemas** (`src/lib/schemas/`): `base.ts`, `d1/*.ts` (8), `d2/*.ts` (8), and `index.ts` exporting `schemaFor(game, category)` and the inferred types (`D1Weapon`, …, `Entity`, `EntityListItem`). Implement `03-CONTENT-MODEL.md` exactly. *(open)* enums validate against `data/vocab` when that file exists, and allow any string otherwise.
2. **Category registry** (`src/config/games.ts`): `GAMES = { d1: { name:'Minecraft Dungeons', short:'Dungeons', year:2020, categories:[…8] }, d2: { name:'Minecraft Dungeons II', short:'Dungeons II', year:2026, categories:[…8] } }`, typed so that `CategorySlug<'d1'>` is a union. `isValidCategory(game, slug)`.
3. **Wiki client** (`scripts/wiki/client.ts`):
   - `wikiGet(params)`: builds a `https://minecraft.wiki/api.php` URL (`format=json&formatversion=2&maxlag=5`), cache lookup in `data/raw-cache/{sha1}.json` → otherwise rate-limited fetch (1 req/s, sequential queue) with `User-Agent: DungeonsCodexBot/1.0 (fan wiki data sync; non-commercial)` → retries per `04-DATA-PIPELINE.md` → stores `{url, fetchedAt, body}`.
   - Helpers: `parsePageHtml(title)`, `getWikitextBatch(titles[])` (50 per call), `getImageInfo(fileTitles[])`, `searchTitle(term)`, `resolveRedirects(titles[])`.
   - `--refresh` bypasses the cache; `--offline` errors on a cache miss.
   - Unit tests mock `fetch`: rate limit spacing, retry/backoff on 429/503, cache hit, maxlag error handling.
4. **Parsing toolkit:**
   - `scripts/wiki/tables.ts`: `parseWikitables(html)` → for each `table.wikitable`: the nearest preceding heading path (h2 > h3 > h4), headers, and rows with `{ text, links:[{title,text}], images:[fileTitle] }` per cell. Handles rowspan/colspan, `<br>` and `<li>` lists, `data-sort-value`, hidden spans, ✔/✖.
   - `scripts/wiki/templates.ts`: `extractTemplates(wikitext, name)` → param maps (handles nested templates, `|` inside `[[links|text]]`, multiline values); `stripWikiMarkup(s)` (links, bold/italic, refs, `{{DuLevelLink|X}}` → X, `{{DuEntityLink|X}}` → X, comments). Decide **wikiparser-node vs custom** by running both on 5 fixture pages; keep the simpler one that passes, uninstall the other, and log it.
   - `scripts/wiki/text.ts`: `parseEffects(text)` → `[{label, value, unit}]` (handles "+30%", "25% less damage", "2.5 second cooldown", "Increases X by 35%"), `parseCooldown`, `toBool('✔')`, `normalizeName`.
5. **Fixtures:** with the real client (this makes live requests at 1 req/s), save trimmed real responses to `tests/fixtures/wiki/`: the `Dungeons:Weapon` HTML, `Dungeons:Armor` HTML, wikitext for `Dungeons:Claymore`, `Dungeons:Katana`, `Dungeons:Hunting_Bow` (or the nearest real titles), `Template:Infobox_Dungeons_item` (+ its `/doc` if it exists), `Dungeons_II:Weapon` HTML, `Dungeons_II:Talisman` HTML. Keep each fixture ≤ 200 kB (trim unrelated sections).
6. **Stat mapping research (required):** read the Infobox template source/doc and determine what `stat`, `stat1`, `stat2`, `stat3` mean for melee, ranged and armor (e.g. damage / speed / area). Check it against 3 item pages' rendered infoboxes (`parsePageHtml` and read the infobox label text). Write the mapping into `[ Plans ]/03-CONTENT-MODEL.md` §3.1 (replacing the "Prompt 03 must…" sentence) and into `scripts/wiki/statMap.ts`. Log it.
7. **Power table parser:** in the Claymore wikitext/HTML, locate the Power → Min/Max damage table and write `parsePowerTable()`. Test it against the fixture (the documented points, e.g. power 1 → 18–19 / 32–34, must parse exactly as the wiki shows; record which column pair maps to `min`/`max` and log the interpretation).
8. **Loaders** (`src/lib/data/`, `server-only`): `getAll(game, category)`, `getBySlug`, `getListItems`, `getCounts(game)`, `getRelated(entity, limit)`, `getByIds(ids)`, `getSyncDate(game)`. They read `data/generated/{game}/{category}.json` with `fs` at build time and memoize. A missing file means an empty array (until Prompts 04/05). Unit-test them against a temp fixture dir (inject the data dir through a parameter or env var).
9. **Validator** `scripts/validate.ts`: for every generated file, run the schema parse plus every cross-reference rule from `03-CONTENT-MODEL.md` §5 and the image existence check. Exit 1 with a readable list of issues. Unit-test it with deliberately broken fixtures.
10. **Overrides loader** `scripts/overrides.ts`: load, validate the shape (a `sourceUrl` is required), apply, and annotate the entity's `overrides`.

## Mini-checklist
- [x] 17 schema modules (base + 8 + 8) + registry; types exported
- [x] Wiki client: cache, 1 req/s queue, retries, maxlag, offline/refresh flags, tested
- [x] tables / templates / text helpers, tested on real fixtures
- [x] Parser library decision logged
- [x] Fixtures saved (≤ 200 kB each)
- [x] **Infobox stat mapping documented** in Plans §3.1 + `statMap.ts` + log
- [x] Power table parser exact on fixture; interpretation logged
- [x] Loaders (server-only), tested
- [x] Validator with cross-ref + image checks, tested
- [x] Overrides loader, tested
- [x] No request sent without the bot User-Agent (unit test asserts the header)

## Acceptance
```bash
npm run verify
```
```bash
npx vitest run tests/unit/scripts --coverage
```
Coverage ≥ 90 % for `scripts/wiki/**`.

## Commit
`feat(data): schemas, wiki API client and parsing toolkit`
