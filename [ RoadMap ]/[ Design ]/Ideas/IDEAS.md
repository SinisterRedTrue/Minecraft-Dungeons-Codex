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

## Data (from Prompt 05)
- [ ] D2 weapon hit tables: the item pages have a per-hit "Base damage / duration / area / knockback" table (Hunter's Hatchet hit 1 = 14 base damage). Not scaled by power, so it was left out; it could feed a simple "damage per combo" row.
- [ ] D2 zones as locations: `The Deep Dark`, `Ravines`, `Dungeon` and `Rift` are used by quests and mob spawn lists but are sub-areas, not main locations (D-058/D-059), so 59 mob spawn references and the quest areas are only text.
- [ ] D2 quest pages: objectives, quest giver, previous/next quest (the infobox has them) for a quest chain view.
- [ ] D2 armor set pages as a "Set" view (base set + its unique set, four pieces each) using `armorSet`.
- [ ] D2 mob pages: per-tier health and soul values as numbers, attacks and drops (D2 pages have no such lists yet).
- [ ] D2 artifact types: the wiki gives none (D-054); a derived "damaging / support / summoning" grouping would need a documented source.
- [ ] D2 tag keyword list: review the 27 tags against the real filter UI in Prompt 07 and merge or split them (D-056).

## App shell (from Prompt 06)
- [ ] Hero parallax: the floating icons only float (6 s sine); a subtle scroll/pointer parallax from Plans §05 was left out.
- [ ] Featured-uniques scroller: ◀ ▶ buttons (Wireframes §2); today it scrolls by touch, wheel and Tab through the cards.
- [ ] Inline section links from `xl` (1280) if the header gets a more compact layout (D-063).
- [ ] A hub "Recently viewed" row once Prompt 09 stores recent items.

## Category browser (from Prompt 07)
- [ ] Remember the last view (grid / table) per category in `localStorage`, as a per-viewer convenience; the URL still wins.
- [ ] Remember the order filters were added so the empty state's "Remove last filter" is truly the last one (it uses filter order today, D-074).
- [ ] Facet counts for toggles ("Unique only (103)") and a count next to each range ("12 items in 10–40").
- [ ] A compact one-line card for very long lists (D1 cosmetics: 288, mostly skins) and a virtualised table if a category ever passes 500 items.
- [ ] Type chips with the item icon of the type (a sword on "Sword") using our own data's images.
- [ ] Match whole property sentences in the in-results search (today: name and tags only, D-073).
- [ ] Keyboard shortcut `/` to focus the in-results search box.

## Detail pages (from Prompt 08)
- [ ] OG cards in the Rubik display font (needs a committed font file; today the default `next/og` font, D-081).
- [ ] A "compare with a sibling" shortcut on a unique variant page (base vs unique stats side by side) before Prompt 11's Compare exists.
- [ ] Section anchors in a sticky mini table of contents on long pages (DLCs, D1 locations).
- [ ] Swipe left / right between entries on phones, mirroring `[` / `]`.
- [ ] Show the reverse "Used in quests" list on item pages once quest rewards resolve more ids.

## Search (from Prompt 09)
- [ ] Record the entity a visitor opens by any link (not only through the palette) so Recent, and a hub "Recently viewed" row, are complete.
- [ ] Highlight the matched letters in each result and show which alias matched ("Totem of Regeneration · aka ToR").
- [ ] Search by stat or property sentence ("pulls in enemies") by adding the property text to a lower-boost field.
- [ ] A "Clear recent" action in the palette and on the About page's privacy note.
- [ ] Prefix commands in the palette: `>` for tools (Forge, Compare, Planner), `@` to restrict to a category.
- [ ] Index the D2 `Rift` zones and sub-areas once they become locations (today they are text).

## Power Forge (from Prompt 10)
- [ ] Compare two enchantment setups side by side (a second result column) and a "best Sharpness-free setup" hint.
- [ ] Show the documented-table range on the power slider (a faint segment up to 108, where the wiki tables end) so the point where numbers turn Approximate is visible before the badge appears.
- [ ] Keep `?forge=` live in the address bar while editing (today only Share and Reset write it).
- [ ] Per-tier tooltips on the enchantment picker (full effect text of tiers I to III) and an Approximate-range display (min and max of the baseline spread) instead of one estimate.
- [ ] Gilded variants of enchantments (the wiki lists Gilded costs 2/3/4 and 3/4/5, not stored: D-041).
- [ ] Armor-set view: all four D2 pieces in one Forge with their combined effects.

## Compare & Favorites (from Prompt 11)
- [ ] ★ and ⇄ buttons in the table view of the Category Browser (a trailing actions column), not only on cards.
- [ ] A Share button on the compare page that copies the URL, and a "compare with a sibling" shortcut on unique variant pages (base vs unique).
- [ ] A "wins 3 of 5 rows" count per item and a "Best overall" sort, clearly labelled as a simple count.
- [ ] Compare enchantments by tier: expand "Effect by level" into three aligned rows.
- [ ] Favorites: custom lists, notes per item and sorting inside a group.
- [ ] Move favorites between devices without an account (a short code or a QR of the backup file).
- [ ] Remember "Differences only" and the last compared category per game.
- [ ] An undo toast after Clear on the tray and after un-starring on the Favorites page.

## Build Planner (from Prompt 12)
- [ ] Notes and the build name in the share preview (OG image of a build with its icons).
- [ ] Compare two saved builds side by side and a "what changed" diff after editing.
- [ ] Drag an item from a card or the search palette into a slot; "Add to planner" in the palette (Alt+Enter).
- [ ] Per-piece view of D2 armor sets ("fill all four pieces of this set") and a set-bonus line if the wiki documents one.
- [ ] Show armor health at the build's power in the D1 summary (the armor power tables exist).
- [ ] Undo and redo for build edits; an undo toast after Clear.
- [ ] Export and import of My builds as a file, like the favorites backup.
- [ ] Remember the last picker sort and keep the search box visible on phones without opening Filters.

## Quality pass (from Prompt 13)
- [ ] Lazy-load the mobile menu sheet and the "Sections" popover (Radix Dialog and Popper are about 25 kB gzip of the shell, only needed on interaction): the largest remaining first-load JS saving.
- [ ] Merge the two sources of a D2 location's sub-areas: the list page (Illager Tower, Orange Tower, …) and the page's own infobox (Puddle Pond Village, The Supreme Evoker's Tower) differ for Rainy Plains.
- [ ] Prefer the item page's tier text over the list page's wording for D1 enchantment tiers ("Deals X damage" vs "X damage dealt by wind"; "3 emeralds spawned" vs "3 emerald spawned").
- [ ] A scheduled "wiki drift" check: re-run `scripts/dev/audit.ts` and list entities whose live revision moved since the sync (Soul Healer had).
- [ ] Real-device Lighthouse run on a throttled phone, and a field-data (CrUX) check once the site is live.

## Deploy & handoff (from Prompt 14)
- [ ] A GitHub Actions workflow that runs `npm run verify` (and the e2e suite) on every push and pull request, so a broken data refresh cannot reach Vercel unnoticed.
- [ ] A stricter CSP without `'unsafe-inline'` for scripts: possible only if the site moves to per-request rendering (nonces) or Next's inline flight scripts become hashable (D-107).
- [ ] `Strict-Transport-Security` and a `security.txt` once a custom domain is attached (Vercel already sends HSTS on `*.vercel.app`).
- [ ] A "last refreshed" automated reminder: a scheduled run that compares the wiki revisions with the synced ones and opens an issue when a patch changed pages.
