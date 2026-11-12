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
| d1 | dlcs | `Dungeons:DLC` (redirects to "Downloadable content") | Each DLC page: summary paragraph, missions, mobs added |
| d1 | cosmetics | `Dungeons:Cosmetic` is an overview; its "Main article" hatnotes lead to the lists: `Dungeons:Cape`, `Emote`, `Flair`, `Hero` (skins), `Pet (cosmetic)` (found by following the hatnotes, D-045) | none |
| d1 | mobs | `Dungeons:Mob` (skip Arcade sections) | Mob pages: health, locations, drops |
| d1 | locations | `Dungeons:Location` → the "Minecraft Dungeons locations" navbox (Missions, Secret missions, Sub-missions; D-044) | Location pages: story, mobs table, unlock |
| d2 | weapons | `Dungeons II:Weapon` (melee, bows, crossbows, Unobtainable tables) | Item pages: infobox flavor `description` (batched); icon from the table |
| d2 | armor | `Dungeons II:Armor` (Helmets/Chestplates/Leggings/Boots) | Item pages: infobox flavor `description`; icon from the table |
| d2 | enchantments | `Dungeons II:Enchantment` (one table; tiers I–III) | none |
| d2 | artifacts | `Dungeons II:Artifact` (one table: cost, cooldown, description) | none |
| d2 | talismans | `Dungeons II:Talisman` | none |
| d2 | quests | `Dungeons II:Quest` (core + side tables) | none |
| d2 | mobs | `Dungeons II:Mob` (icon lists under "List of mobs") | Mob pages: infobox health, Spawning list, tier groups |
| d2 | locations | `Dungeons II:Location` (Overworld + Sift tables, Rift DLC list) | Location pages: lead paragraph, mobs found |

**Title resolution:** if a list page title 404s, the parser must (a) query `?action=query&list=search&srsearch={term}&srnamespace=*`, and (b) look at the `Dungeons:Wiki` hub links, then use the matching hub link and log it. It must **not** guess titles in a loop.

**Expected counts (from research, for coverage checks):**
| d1 weapons | 83 melee + 72 ranged obtainable (unused excluded) |
|---|---|
| d1 armor | 71 (unused excluded) |
| d1 artifacts | 46 listed, minus 8 unused = 38 (verify) |
| d2 weapons | 58 melee + 12 bows + 10 crossbows active, + 4 unobtainable melee (confirmed: 84 rows) |
| d2 armor | 38 sets × 4 slots (confirmed: 152 rows, all sets complete) |
| d2 talismans | 24 (confirmed) |
| d2 quests | 15 core + 27 side = 42 (confirmed) |

Counts stated on a list page's intro text (re-read at sync time) **override** this table. The coverage report compares them. If a page's own number is wrong, `data/overrides/{game}/expected.json` (`[{ category, count, reason, sourceUrl }]`) corrects it with a source, like any other override (D-039): D1 weapons are **153** (the intro counts the unused Monkey Motivator and Spider Crossbow) and D1 artifacts **45** (the intro counts the unused consumable Icon Map). Categories whose pages state no total use the number of candidate rows found.

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
- **Property tags:** collect every distinct property string per game and category, then map each to a kebab-case tag in `data/vocab/{game}/properties.json` (`{ "Dual wield": "dual-wield", … }`). The first sync generates this file automatically; later syncs fail if a new unmapped property appears, so new properties are reviewed and added. This vocab drives the "Properties" filters. **D2 (D-056):** `data/vocab/d2/properties.json` is a reviewed keyword list `{ tag: [regex fragment, …] }` applied to the effect texts instead (D2 effects are sentences); entities whose text matches nothing stay untagged.
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
- Sources of 64 px or less are stored lossless; larger ones are quality 90, at most 640 px wide (D-047). Mob faces and level sprites are the icons of mobs and locations.
- Path: `public/images/{game}/{category}/{slug}.webp`. Skip the download if the file already exists and the source sha1 (from imageinfo) is unchanged. Store a `public/images/manifest.json` of `{ path: sha1 }`.
- In the UI, pixel-art icons use `image-rendering: pixelated`.
- Every page that shows an image credits its source page (see `09-LEGAL-AND-ATTRIBUTION.md`).

## Coverage report (`data/reports/coverage-{game}.md`)
For each category it lists: expected count vs. parsed count vs. valid count; dropped records with reasons; `partial` entities and their missing fields; unresolved references; slug collisions; missing images; and overrides applied (including overrides whose slug matched nothing, from `applyOverrides().unmatched`). Unresolved references go under a heading containing "Unresolved references", one bullet per raw value with the value in backticks (``- `Gift Wrapper` — used by …``); `data:validate` reads exactly that list (D-037). **Gate:** valid/expected ≥ 98 % per category. A category below the gate is not done. Fix the parser, or add overrides with sources, until it passes. The report is rendered from `data/reports/coverage-{game}.json`, which keeps every category between runs; `npm run data:coverage` prints it and exits 1 below the gate.

## Power Forge data (`data/forge/{game}/curves.json`)
- Output (D-048): `data/forge/d1/curves.json` = `{ version, basis, weapons: { melee, ranged, byWeaponType }, armor: { health }, itemsWithOwnTable: { weapons, armor } }`; a curve is `{ powers, min, max, samples }` (weapon `min`/`max` are median multipliers of the power-1 value, armor values are absolute health).
- D1: for every weapon whose item page has a power/damage table (Power, Min, Max), store the points in `powerTable` (`parsePowerTable` + `toPowerTable` in `scripts/wiki/powerTable.ts`; mapping in D-035). Armor pages use the same layout for **health** (`Power | Min health | Max health`), read with `parsePowerTable(wikitext, { measure: 'health' })` into `D1Armor.powerTable` (D-042); armor has no power-1 base to divide by, so its curve is the median absolute health per power.
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
