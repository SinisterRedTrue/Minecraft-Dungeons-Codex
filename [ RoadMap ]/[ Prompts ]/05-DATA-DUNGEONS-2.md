# Prompt 05: Dungeons II Data (all 8 categories + images)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 04.
**Read first:** `[ Plans ]/03-CONTENT-MODEL.md` §1, §4, §5; `04-DATA-PIPELINE.md`.

## Goal
`data/generated/d2/*.json` for Weapons, Armor, Enchantments, Artifacts, Talismans, Quests, Mobs and Locations at ≥ 98 % coverage, with images and validation passing. Any D2 schema sections that were left for this prompt are finalized in Plans.

## Tasks
1. **Schema finalization (do this first):** fetch and inspect `Dungeons_II:Enchantment`, `Dungeons_II:Artifact`, `Dungeons_II:Mob` and `Dungeons_II:Location` (HTML tables + headings). Update `[ Plans ]/03-CONTENT-MODEL.md` §4.3, §4.4, §4.7, §4.8 with the real columns and enums, then update the Zod schemas to match. Log D-0xx entries. Also confirm the Build Planner slot counts for D2 (artifact slots, talisman slots, whether D2 gear takes enchantments) from the wiki's gameplay pages (search `Dungeons_II:Talisman`, `Dungeons_II:Artifact`, `Dungeons_II:Enchanting`), and record them in `[ Plans ]/07-FEATURES-SPEC.md` §5 (replacing "Prompt 12 confirms…" with the facts) and log it.
2. **Parsers** `scripts/parsers/d2/*.ts`:
   - **weapons:** Melee + Ranged tables → `kind`, `weaponType` (melee: from section/grouping, or a name-pattern table if the wiki gives no grouping; log that choice; ranged: bow/crossbow), `rarity`, `effect` + `effectValues`, `comboLength`/`ammo`, `locations`; the "Unobtainable" list → `obtainable:false`.
   - **armor:** Helmets/Chestplates/Leggings/Boots tables → `slot`, `armorSet`, `rarity`, `effects` + `effectValues`, `locations`. Make sure all 4 pieces of every set are found; list incomplete sets in coverage.
   - **talismans:** Passive Bonus, Secret ✔/✖, Boost Type, T1–T3 (keep the raw text; parse the value where it's numeric, e.g. "10% while health is above 95%" → value 10 + text kept; "25%/7000" → value 25 + text kept), source type from the source bullet, location.
   - **quests:** core + side tables → `questType`, `order` (core table order), `locationIds`, `rewards` (XP numbers, items, "Random gear from X" → `randomFrom`, First/Subsequent → `when`), `dlcExclusive`. Skip unused quests.
   - **enchantments, artifacts, mobs, locations:** following the finalized schemas.
3. Link, derive, vocab (`data/vocab/d2/properties.json` from effect keywords: build tags from a reviewed keyword list such as `ranged-damage`, `cooldown`, `movement-speed`, `lifesteal`, `souls`, `burn`, `freeze`, `poison`, `lightning`, `knockback`, `area`, `crit`; log the list), images, and `data/forge/d2/curves.json = {}`.
4. **Run the full sync** in the background: `npm run data:sync -- --game d2 --category all --images`.
5. **Coverage loop** to ≥ 98 % (expected counts: 80 active weapons + 4 unobtainable, 38 sets × 4, 24 talismans, 42 quests, or whatever the live page intros say).
6. **Spot check** 10 random D2 entities against the live wiki; log the results and fix mismatches.
7. **Parser tests** for all 8 D2 categories with fixtures (≥ 3 known entities each, e.g. Hunter's Hatchet, Tendrils of the Sprout, Thrifty Pendant, a core quest).

## Mini-checklist
- [ ] D2 schemas finalized in Plans + Zod (logged)
- [ ] D2 Planner slot facts recorded in 07-FEATURES-SPEC §5 (logged)
- [ ] 8 D2 parsers
- [ ] Unobtainable weapons flagged; armor sets complete or reported
- [ ] Talisman tier values parsed without losing the raw text
- [ ] Quest rewards structured (first/subsequent, randomFrom)
- [ ] Vocab + images + empty forge curves
- [ ] Coverage ≥ 98 % for all 8 (report committed)
- [ ] 10-entity spot check logged
- [ ] Parser tests for all 8
- [ ] `data:validate` passes with 0 issues for d1 **and** d2

## Acceptance
```bash
npm run data:sync -- --game all --category all --offline
```
```bash
npm run data:validate
```
```bash
npm run verify
```
There's no diff after the offline re-sync.

## Commit
`feat(data): Minecraft Dungeons II data for all 8 categories with images`
