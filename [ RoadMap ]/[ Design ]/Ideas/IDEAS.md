# Ideas & Backlog (NOT in v1.0 scope)

> Rule: anything new that comes up during the build goes here, not into the code. After v1.0 ships, the user picks items from this list for v1.1+.

## Flavor & delight
- [ ] Animated torch flicker on the hero glow (CSS only, reduced-motion safe).
- [ ] An Easter egg: typing the Konami code turns every icon into a chicken (Dungeons pet joke).
- [ ] "Random item" button (dice icon) on each hub.
- [ ] Rarity-colored particle burst when a Unique is favorited.
- [ ] Sound toggle with subtle UI clicks (off by default).
- [ ] Sheet: full swipe-to-dismiss following the finger (v1.0 closes after an 80 px downward drag on the handle).
- [ ] Tooltip on touch: long-press support beyond focus/hover.

## Features
- [ ] D1 ↔ D2 "spiritual successor" links (e.g. a D1 weapon type to its D2 equivalent).
- [ ] Mission planner: pick a location and see every unique that drops there with its difficulty.
- [ ] Enchantment synergy hints in the Build Planner (e.g. "Committed + low-health builds").
- [ ] Printable / image export of a build (OG-style card).
- [ ] Community "tier list" mode (local only, then shareable link).
- [ ] Item changelog from the wiki's HistoryTable.
- [ ] Automatic weekly data refresh with GitHub Actions + a PR containing the diff.
- [ ] PWA / offline mode.
- [ ] Analytics (privacy-friendly, e.g. Vercel Web Analytics) if the community wants usage stats; needs a Privacy update.

## Content
- [ ] D2 DLC section once D2 DLC is released.
- [ ] Arcade (D1) section.
- [ ] Soundtrack and cinematics pages.

## Data (from Prompt 04)
- [ ] Sub dungeons (about 300 floors, rooms and arena variants) as locations, or as a list on each mission page; the sync skips them today (D-044).
- [ ] Keep the "Common and Rare" rarity pair of base items (`rarities: []`) and filter on both (D-040).
- [ ] Mob pages: structured per-tier health and damage, full Spawning and Drops lists, equipment (the infobox has them as text).
- [ ] Minimum difficulty (I to V) on locations, from the mission infobox; `recommendedPower` has no source.
- [ ] Gilded enchantment costs (`[2,3,4]` / `[3,4,5]`) and the four built-in exclusives whose cost the wiki lists as Unknown (D-041).
- [ ] Cosmetics: a flair-kind filter (healing / level up / mob) and hero skins grouped by where they come from.
- [ ] A short "upstream mistakes" note the sync prints (wrong intro counts, mis-categorised pages) that could be reported to wiki editors.
