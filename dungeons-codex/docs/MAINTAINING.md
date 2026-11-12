# Maintaining Dungeons Codex

A guide for whoever keeps the site current: the owner, a friend, or a future Claude session. Every
command runs in the app folder (`dungeons-codex/`) unless it says otherwise. The product and
technical decisions live in the RoadMap (`[ RoadMap ]/[ Plans ]/00-INDEX.md`); read the relevant
plan before you change behaviour, and log a new decision in `10-DECISIONS-LOG.md`.

## How the data flows

```
minecraft.wiki ──(npm run data:sync, on your machine)──► data/raw-cache      (gitignored)
   parsers + overrides + linking + Zod ──► data/generated/{d1,d2}/*.json    (committed)
   images ──► public/images/{game}/{category}/*.webp + manifest.json        (committed)
next build (Vercel) reads ONLY data/generated and public/images. It never calls the wiki.
```

`npm run build` runs `prebuild` first (`npm run data:index`), which reads only local files and
writes the search index, compare data, Forge catalog and planner data under `public/`. A build
never contacts the wiki.

## Refresh the data after a game patch

Say to Claude: _"Refresh the Dungeons Codex data from the wiki following MAINTAINING.md, verify, and
commit."_ Or do it by hand:

```bash
npm run data:sync -- --game all --category all --images --refresh
```

```bash
npm run data:validate && npm run data:coverage && npm run data:index
```

```bash
npm run verify
```

```bash
git add data public/images && git commit -m "data: refresh from minecraft.wiki"
```

Then `git push`; Vercel deploys on its own.

What to look at before you commit:

- `data/reports/coverage-{d1,d2}.md`: every category must stay at or above 98 % valid ÷ expected
  (`npm run data:coverage` exits 1 below that). Read the "Dropped records", "Partial entities" and
  "Unresolved references" sections of anything that changed.
- `git diff --stat data/generated`: a patch should change a few files, not all of them. A huge diff
  usually means a parser broke or the wiki restructured a page.
- `data:sync` fails on purpose when a new property string has no tag in `data/vocab/d1/properties.json`
  (D1) or a new enum value is not in `data/vocab/{game}/enums.json`. Add the mapping (kebab-case
  tag, or the new enum value), then run the sync again.
- New entities appear on the site by themselves: category pages, detail pages, search, sitemap and
  OG images are all generated from the data.

### Sync flags

| Flag                 | Meaning                                                      |
| -------------------- | ------------------------------------------------------------ |
| `--game d1\|d2\|all` | which game                                                   |
| `--category <slug>`  | one category, or `all`                                       |
| `--images`           | also download new or changed icons and convert them to WebP  |
| `--refresh`          | ignore the cache and fetch every page again                  |
| `--offline`          | cache only; makes **0 requests**, fails if a page is missing |

A re-run from the same cache gives byte-identical output, so `git diff` shows only real changes.

## Corrections the wiki gets wrong (overrides)

Never edit `data/generated/*.json` by hand: the next sync overwrites it. Put the fix in
`data/overrides/{game}/{category}.json`:

```json
[
  {
    "slug": "claymore",
    "set": { "comboLength": 3 },
    "reason": "List table is missing the value",
    "sourceUrl": "https://minecraft.wiki/w/Dungeons:Claymore"
  }
]
```

- `slug` names the entity; `set` takes fields, dotted paths allowed (`"stats.damage": 11`).
- An override without a `sourceUrl` and a `reason` is rejected. The entity records which fields were
  overridden in its `overrides` field.
- The coverage report lists overrides whose slug matched nothing; remove those.
- When a list page states a wrong total, correct the expected count in
  `data/overrides/{game}/expected.json` (`[{ category, count, reason, sourceUrl }]`).

## Add a filter (config only)

Filters are declarative. Open `src/config/filters/{game}/{category}.ts` and add a definition with the
helpers from `shared.ts` (`multiDef`, `rangeDef`, `toggleDef`, `typeDef`, `opts`):

```ts
multiDef({ key: 'effect', param: 'fx', label: 'Effect', field: 'effects.label', match: 'all' }),
```

- `param` is the short URL parameter and must be unique within the category.
- `field` is a path into the list projection (`src/lib/data/project.ts`); `a.b` and
  `arr[key=value].prop` work. If the field is not in the projection yet, add it there.
- `npm run test` runs `category-config.test.ts`, which checks every param is unique and every field
  exists in the real data, so a typo fails loudly.
- The facet counts, active-filter chips, mobile sheet and URL state come for free.

## Add a new category (or a whole new section)

This is a bigger change; follow the order, and run `npm run verify` after each step.

1. `src/config/games.ts`: add the slug to the game's `categories`.
2. `src/lib/schemas/{game}/{category}.ts`: a Zod schema module, and its entry in `schemas/index.ts`
   (the `schemaFor` registry and the exported types).
3. `scripts/parsers/{game}/{category}.ts` and the line in `scripts/parsers/registry.ts`; link
   references in `scripts/pipeline/link*.ts` when the category points at other entities.
4. `data:sync -- --game {game} --category {slug} --images`, then check the coverage report.
5. `src/config/categories.ts` and `src/config/display/{game}.ts` (labels, icon, card fields,
   table columns), `src/config/filters/{game}/` (filters), `src/config/detail.ts` (which sections
   the detail page shows) and `src/config/comparable.ts` (compare rows).
6. Add the category to the unit tests that enumerate the 16 pairs and to the e2e sweeps
   (`categories.spec.ts`, `detail.spec.ts`, `a11y.spec.ts`), then run `npm run e2e`.

## Add the Dungeons II DLC section later

Not built yet: Dungeons II has no DLC at the time of v1.0. When it ships, follow "Add a new
category" for a `dlcs` category of `d2`, and read `[ RoadMap ]/[ Design ]/Ideas/IDEAS.md` (section
Content) first, which holds the notes on what to scrape.

## Troubleshooting the scraper

| Symptom                                  | Cause and fix                                                                                                                                                                                                                                                               |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Old data keeps coming back               | The sync uses `data/raw-cache/` (gitignored). Add `--refresh`, or delete the cache folder.                                                                                                                                                                                  |
| `429` or `maxlag` messages               | Expected now and then. The client waits 2, 4, 8, 16, then 32 seconds and gives up on that page only. Run the sync again later; cached pages are not fetched twice.                                                                                                          |
| A whole category parses to 0 items       | The wiki renamed or restructured a list page. Open the page named in `[ Plans ]/04-DATA-PIPELINE.md` ("Source pages"), compare it with the saved fixture in `tests/fixtures/`, and fix the parser. The client never guesses titles; it searches once and logs what it used. |
| Coverage below 98 % for a category       | Open `data/reports/coverage-{game}.md`: dropped records say which required field is missing. Fix the parser, or add an override with a source.                                                                                                                              |
| `data:validate` reports unresolved links | A name in one category does not match any entity of another. Add a redirect in the wiki page, or an override. The list is under "Unresolved references" in the coverage report.                                                                                             |
| New "unmapped property" or enum error    | Add it to `data/vocab/{game}/properties.json` or `enums.json` (see above).                                                                                                                                                                                                  |
| An image is missing                      | `npm run data:sync -- --game <g> --category <c> --images`; the report lists missing images.                                                                                                                                                                                 |
| Tests fail after a refresh               | Some unit tests assert real counts and stale generated files (compare, planner, search). Run `npm run data:index`, then `npm run test`.                                                                                                                                     |

The sync identifies itself as `DungeonsCodexBot/1.0 (fan wiki data sync; non-commercial)` with no
personal details, takes at most one request per second, and sets `maxlag=5`. Keep it that way.

## The checks, and when to run them

| Command                                       | What it proves                                                                                                         |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run verify`                              | typecheck, lint, prettier, no raw hex colours, unit tests, data validation, production build. Run before every commit. |
| `npm run e2e`                                 | builds, serves on port 3100, runs every Playwright spec (both viewports, axe, keyboard, SEO, headers, legal).          |
| `E2E_DEV_SERVER=1 npx playwright test ui-kit` | the dev-only `/dev/ui` showcase specs (a 404 in production).                                                           |
| `npm run knip`                                | unused files and exports.                                                                                              |
| `npx tsx scripts/dev/bundle-size.ts --check`  | first-load JavaScript against the budgets (D-101).                                                                     |
| `npx tsx scripts/dev/seo-audit.ts`            | titles, canonicals, descriptions across every built page.                                                              |

## Deployment

Vercel builds `dungeons-codex/` (set **Root Directory** to `dungeons-codex`) with the default Next.js
settings. The one environment variable is `NEXT_PUBLIC_SITE_URL` (the production origin, used for
sitemap, canonical and Open Graph URLs). The build needs no secrets and never contacts the wiki (its only network use is `next/font` fetching Rubik and Silkscreen from Google Fonts, then self-hosting them). Security
headers and the Content Security Policy are set in `next.config.ts` (D-107); the e2e spec
`headers.spec.ts` asserts them. If you add anything that loads from another origin (an analytics
script, a font CDN), the CSP has to name it, and `/about`'s privacy paragraph has to change.
