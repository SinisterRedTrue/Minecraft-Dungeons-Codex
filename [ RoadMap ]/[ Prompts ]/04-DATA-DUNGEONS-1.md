# Prompt 04: Dungeons 1 Data (all 8 categories + images)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 03.
**Read first:** `[ Plans ]/03-CONTENT-MODEL.md` §1–3, §5; `04-DATA-PIPELINE.md` (all of it).

## Goal
`data/generated/d1/*.json` for all 8 categories, with self-hosted images, property vocab, Forge curves, and coverage reports at ≥ 98 %, all passing `data:validate`.

## Tasks
1. **Sync CLI** (`scripts/sync.ts`): flags `--game d1|d2|all`, `--category <slug>|all`, `--images`, `--refresh`, `--offline`. Pipeline per category: `parse → normalize → overrides → (after all categories) link → derive → validate → write (sorted, 2-space JSON) → images → vocab → coverage`. Print a summary table.
2. **Parsers** `scripts/parsers/d1/{weapons,armor,enchantments,artifacts,dlcs,cosmetics,mobs,locations}.ts`, using the source pages in `04-DATA-PIPELINE.md`:
   - **weapons:** list tables (Melee + Ranged sections; skip "Unused") → membership and columns; then batch the wikitext of every item page → infobox (stats via `statMap`, description, image, damagetype, variants, soulenchantments) + `parsePowerTable`. `weaponType` comes from "Group of" (a unique item uses its base's group). `isSeasonal` comes from the seasonal marker or section. `baseItemId`/`variantIds` come from "Group of" + Unique.
   - **armor:** same pattern; `damageReduction` + `effects` from properties via `parseEffects`.
   - **enchantments:** section → `appliesTo`/`section`; Common/Powerful label → `tier`; Tier I/II/III cells → `levels`; `pointCost` from the cost table (gilded logic per schema); `stackable`, `mobObtainable`, `builtInto` (linked later).
   - **artifacts:** section heading → `artifactType`; `cooldownSeconds`; `requiresSouls`; DLC.
   - **dlcs:** title, order (release order), release date, summary, missions → `locationIds`.
   - **cosmetics:** each cosmetic list/section → `cosmeticType`, `obtainedFrom`, `season`.
   - **mobs:** sections → `mobType` (skip Arcade); enrich from mob pages (health, attacks, locations, drops).
   - **locations:** sections → `locationType`/`region`; enrich mobs; `secretOf`.
3. **Linking + derived fields:** resolve every reference by name → id (exact, case-insensitive, then redirects). Compute `itemIds` on locations, `contentCounts` on DLCs, and `builtInto` ↔ `builtInEnchantments` symmetry. Set `related`: base ↔ variants + up to 6 of the same `weaponType`/`armorGroup` (deterministic: alphabetical).
4. **Vocab:** generate `data/vocab/d1/properties.json` (property string → tag) on the first run; after that, an unmapped property fails the sync with a list. Hand-review the generated tags for sense (merge true duplicates like "Dual Wield" / "Dual wield") and log the merges.
5. **Images:** `scripts/images.ts` per `04-DATA-PIPELINE.md` (batched imageinfo, sha1 manifest, WebP, nearest-neighbor ×4 upscale for ≤ 64 px sources). Fill `image.alt` = `"{name} icon"`.
6. **Forge curves:** build `data/forge/d1/curves.json` from all `powerTable`s (median normalized multipliers per `weaponType` and per kind). Store the list of items that have their own table.
7. **Run the full sync** in the background: `npm run data:sync -- --game d1 --category all --images`. At 1 req/s this takes about 15–30 min the first time.
8. **Coverage loop:** read `data/reports/coverage-d1.md`. For every category under 98 %, or with dropped records, fix the parser (preferred) or add overrides with source URLs, then re-run offline (`--offline`) until it passes. Check that the expected counts were re-read from the list page intros.
9. **Spot check:** pick 10 random D1 entities across categories, compare each field by field with the live wiki page (with `parsePageHtml`), and record the results in the Checklist log. Fix any mismatches.
10. **Tests:** one parser test per category using fixtures (save a trimmed fixture for each list page you didn't already have), asserting ≥ 3 known entities field by field (e.g. Claymore, Katana, Daggers, Hunting Bow, Hero's Armor, Sharpness, Fireworks Arrow, Corrupted Beacon, a DLC, a cape, Arch-Illager, Creeper Woods).

## Mini-checklist
- [x] Sync CLI with all flags + summary output
- [x] 8 D1 parsers
- [x] Linking + derived fields (itemIds, contentCounts, related, builtInto symmetry)
- [x] Property vocab generated + reviewed (merges logged)
- [x] Images downloaded, WebP, manifest, alt text
- [x] Forge curves generated
- [x] Full sync completed
- [x] Coverage ≥ 98 % in all 8 categories (report committed)
- [x] 10-entity spot check logged, mismatches fixed
- [x] Parser tests for all 8 categories
- [x] `data:validate` passes with 0 issues

## Acceptance
```bash
npm run data:sync -- --game d1 --category all --offline
```
```bash
npm run data:validate
```
```bash
npm run verify
```
`git diff --stat` after the offline re-sync shows **no changes** (determinism).

## Commit
`feat(data): Minecraft Dungeons data for all 8 categories with images`
