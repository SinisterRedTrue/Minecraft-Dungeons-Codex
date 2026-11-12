# 04: Data Pipeline (minecraft.wiki → JSON + images)

## Principles
1. **Sync is local and explicit.** `npm run data:sync` runs on the developer machine. The Vercel build never contacts the wiki.
2. **Polite scraping.** At most **1 request per second**, sequential, with a `User-Agent` of `DungeonsCodexBot/1.0 (fan wiki data sync; non-commercial)`. No personal info. Use `maxlag=5`, and back off exponentially on 429/5xx (2 s, 4 s, 8 s, 16 s, 32 s, then fail that page and continue).
3. **Cache everything.** Every API response is saved to `data/raw-cache/{sha1(url)}.json` along with its URL, revision id and fetch time. Re-runs use the cache unless `--refresh` is passed. A full re-sync should be able to run offline from the cache.
4. **Deterministic output.** The same cache gives byte-identical `data/generated` (sorted keys and arrays, no timestamps except `source.fetchedAt`, which comes from the cache).
5. **Validate or fail loudly.** Every entity goes through Zod. A record that's missing a *required* field is either fixed by an override or **dropped and listed** in the coverage report. It must never be written invalid.

## API endpoints (MediaWiki, `https://minecraft.wiki/api.php`)
| Need | Call |
|---|---|
| Rendered HTML of a list page (tables) | `?action=parse&page={title}&prop=text\|revid&format=json&formatversion=2` |
| Wikitext of an item page (infobox, power table) | `?action=parse&page={title}&prop=wikitext\|revid&format=json&formatversion=2` |
| Batch wikitext (up to 50 titles) | `?action=query&prop=revisions&rvprop=content\|ids&rvslots=main&titles=A\|B\|…&format=json&formatversion=2` ← **preferred for item pages** |
| Image file URLs (up to 50) | `?action=query&prop=imageinfo&iiprop=url\|size\|mime&titles=File:A.png\|…&format=json&formatversion=2` |
| Template documentation | `?action=parse&page=Template:Infobox_Dungeons_item&prop=wikitext` |

Confirmed in research (2026-11-12): the API returns JSON. D1 item pages use `{{Infobox Dungeons item}}` with params `title, image, image2, imagesize, type, rarity, stat, stat1, stat2, stat3, property, damagetype, soulenchantments, variant…variant4, runes, levelid, description`. D2 pages have **no infobox**; their data is in wikitables on the list pages.

## Source pages per category
| Game | Category | List page(s) (tables → membership + columns) | Per-item enrichment |
|---|---|---|---|
| d1 | weapons | `Dungeons:Weapon` (Melee + Ranged sections) | Item pages: infobox stats, power table, description, image |
| d1 | armor | `Dungeons:Armor` | Item pages: infobox, description, image |
| d1 | enchantments | `Dungeons:Enchantment` (Melee/Ranged/Armor/Exclusive/Mob-exclusive; skip Unused) | Item pages for gilded text if missing |
| d1 | artifacts | `Dungeons:Artifact` (skip Unused) | Item pages for description/image |
| d1 | dlcs | `Dungeons:DLC` (if that 404s: the DLC tiles on `Dungeons:Wiki`) | Each DLC page: release date, missions |
| d1 | cosmetics | `Dungeons:Cosmetic` (plus sub-lists: capes, pets, emotes, flares, skins) | none |
| d1 | mobs | `Dungeons:Mob` (skip Arcade sections) | Mob pages: health, locations, drops |
| d1 | locations | `Dungeons:Location` | Location pages: mobs, secrets |
| d2 | weapons | `Dungeons_II:Weapon` | none (no infobox), image only |
| d2 | armor | `Dungeons_II:Armor` (Helmets/Chestplates/Leggings/Boots) | image only |
| d2 | enchantments | `Dungeons_II:Enchantment` | as needed |
| d2 | artifacts | `Dungeons_II:Artifact` | as needed |
| d2 | talismans | `Dungeons_II:Talisman` | image only |
| d2 | quests | `Dungeons_II:Quest` (core + side; skip unused) | none |
| d2 | mobs | `Dungeons_II:Mob` | as needed |
| d2 | locations | `Dungeons_II:Location` | as needed |

**Title resolution:** if a list page title 404s, the parser must (a) query `?action=query&list=search&srsearch={term}&srnamespace=*`, and (b) look at the `Dungeons:Wiki` hub links, then use the matching hub link and log it. It must **not** guess titles in a loop.

**Expected counts (from research, for coverage checks):**
| d1 weapons | 83 melee + 72 ranged obtainable (unused excluded) |
|---|---|
| d1 armor | 71 (unused excluded) |
| d1 artifacts | 46 listed, minus 8 unused = 38 (verify) |
| d2 weapons | 58 melee + 12 bows + 10 crossbows active, + 4 unobtainable melee |
| d2 armor | 38 sets × 4 slots (verify) |
| d2 talismans | 24 |
| d2 quests | 15 core + 27 side = 42 |

Counts stated on a list page's intro text (re-read at sync time) **override** this table. The coverage report compares them.

## Parser architecture
```
scripts/wiki/client.ts     fetchJson(url) → cache → rate limit → retry; getRevision()
scripts/wiki/tables.ts     parseWikitable($table) → { headers[], rows: Record<header, {text, links[], images[]}>[] }
                           handles rowspan/colspan, <br> lists, icons, sortkeys
scripts/wiki/templates.ts  extractTemplate(wikitext, name) → Record<param, string>; stripWikiMarkup()
scripts/wiki/text.ts       parsePercentEffects("Take 25% less damage…") → [{label, value, unit}]
                           parseCooldown("2.5 second cooldown") → 2.5
scripts/parsers/{game}/{category}.ts
                           export async function parse(ctx): Promise<RawEntity[]>
scripts/sync.ts            for each category: parse → normalize → apply overrides → link refs
                           → compute derived fields → zod → write JSON → images → coverage
```
- **Normalization:** slugify names (`'Hunter's Hatchet'` → `hunters-hatchet`), trim, collapse whitespace, strip footnote markers (`[1]`), turn `✔/✖` into booleans, and map rarity text to the enum.
- **Property tags:** collect every distinct property string per game and category, then map each to a kebab-case tag in `data/vocab/{game}/properties.json` (`{ "Dual wield": "dual-wield", … }`). The first sync generates this file automatically; later syncs fail if a new unmapped property appears, so new properties are reviewed and added. This vocab drives the "Properties" filters.
- **Linking:** after every category of a game is parsed, a linking pass resolves location/item/mob/enchantment names to ids by exact name, then by case-insensitive name, then by a redirect map (`?action=query&redirects&titles=…`). Unresolved names stay as raw text and are reported.

## Overrides
`data/overrides/{game}/{category}.json`:
```json
[{ "slug": "claymore", "set": { "comboLength": 3 }, "reason": "List table missing value", "sourceUrl": "https://minecraft.wiki/w/Dungeons:Claymore" }]
```
Overrides are applied after parsing and before validation, and they're recorded on the entity's `overrides` field. Overrides with no `sourceUrl` are rejected.

## Images
- Image names come from the table's icon cell or the infobox `image` param.
- `?action=query&prop=imageinfo` (batched 50) → download the original → sharp → WebP at quality 90, keeping pixel art crisp: when the source is ≤ 64 px, upscale ×4 with `kernel: 'nearest'`. Store the width and height.
- Path: `public/images/{game}/{category}/{slug}.webp`. Skip the download if the file already exists and the source sha1 (from imageinfo) is unchanged. Store a `public/images/manifest.json` of `{ path: sha1 }`.
- In the UI, pixel-art icons use `image-rendering: pixelated`.
- Every page that shows an image credits its source page (see `09-LEGAL-AND-ATTRIBUTION.md`).

## Coverage report (`data/reports/coverage-{game}.md`)
For each category it lists: expected count vs. parsed count vs. valid count; dropped records with reasons; `partial` entities and their missing fields; unresolved references; slug collisions; missing images; and overrides applied (including overrides whose slug matched nothing, from `applyOverrides().unmatched`). Unresolved references go under a heading containing "Unresolved references", one bullet per raw value with the value in backticks (``- `Gift Wrapper` — used by …``); `data:validate` reads exactly that list (D-037). **Gate:** valid/expected ≥ 98 % per category. A category below the gate is not done. Fix the parser, or add overrides with sources, until it passes.

## Power Forge data (`data/forge/{game}/curves.json`)
- D1: for every weapon whose item page has a power/damage table (Power, Min, Max), store the points in `powerTable` (`parsePowerTable` + `toPowerTable` in `scripts/wiki/powerTable.ts`; mapping in D-035). Armor pages use the same layout for **health** (`Power | Min health | Max health`), read with `parsePowerTable(wikitext, { measure: 'health' })`.
- Build a **category curve** for each `weaponType` by normalizing each item's table to its power-1 value, then taking the median multiplier at each documented power level. Items with no table use their weaponType curve; if that type has no curve, they use the global melee or ranged curve. Every value that doesn't come from the item's own table is flagged `approximate`.
- D2: the wiki has no numeric power data (as of 2026-11-12). `curves.json` for d2 is `{}`, and the Forge shows tier effects only (see `07-FEATURES-SPEC.md`).

## Refresh procedure (documented in the README by Prompt 14)
```bash
cd dungeons-codex
npm run data:sync -- --game all --category all --images --refresh
npm run data:validate && npm run data:coverage && npm run data:index
npm run verify
git add data public/images && git commit -m "data: refresh from minecraft.wiki"
```
