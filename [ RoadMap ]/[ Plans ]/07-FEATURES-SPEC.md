# 07: Features Spec

## 1. Codex Search (global)
- Opens with `Ctrl+K` / `⌘K`, `/`, or the header Search button. It's a cmdk dialog.
- Scope chips: **This game** (default when inside `/d1` or `/d2`) or **Both games**.
- The index has one entry per entity, with short keys: `{ id, g, c, s, n, a, t, r?, i? }` (id, game, category, slug, name, aliases, tags, rarity, image). FlexSearch uses a forward tokenizer on `n`, `a` and `t`; our scorer applies the field weights (name > aliases > tags, 3 : 2 : 1 in spirit) because FlexSearch 0.8 has no per-field boost. Typos are tolerated by an edit-distance-1 pass over names and aliases (tokens of 4+ letters) that runs when fewer than 3 exact hits exist. See D-082 to D-084.
- Results are grouped by category, with up to 8 per group, showing icon, name, category and game badge. `Enter` opens the item; `Ctrl+Enter` (⌘+Enter on a Mac) adds it to Compare when the category supports Compare, keeps the palette open and answers in a status strip inside it (D-094).
- With no query, it shows **Recent** (the last 8 opened, in localStorage) and **Jump to** (the 8 categories of the current game).
- Index files: `public/search/d1.json` and `public/search/d2.json` are fetched lazily the first time the palette opens and kept in memory.

## 2. Power Forge (stat simulator)
**Goal:** pick an item, move a power slider and tick enchantments with their tiers, then see the stats update live.

### UI
- Shown on the detail pages for D1 weapons and armor, D2 weapons and armor, D1/D2 enchantments (tier viewer only), and D2 talismans (tier viewer only). Delivery: the page carries the item's table and curves; the enchantment catalog is fetched from `/forge/{game}.json` when the lazy Forge mounts (D-087).
- Layout: on the left, the **controls**; on the right, the **result panel** with animated StatBars and number tickers.
  - **Power slider** (Radix Slider): D1 range 1–263, with tick marks at the wiki's documented caps (250 normal, 256 daily trial/raid captain, 263 Tower/raid chest). The number input next to it stays in sync.
  - **Enchantment slots**: 3 slots. Each is a combobox of enchantments that apply to this item kind, plus a tier selector I/II/III. Built-in enchantments are pre-filled and locked. Each slot is one pick (the in-game "pick one of three per row" is simplified to one per slot and noted in the UI help text).
  - **Enchantment points used**: Σ costs from `pointCost`.
  - Reset button; "Share" copies a URL (`?forge=<encoded>` on the detail page).
- **Result panel**:
  - D1 weapon: Damage per hit (min–max) at the chosen power, then the same after enchantment multipliers; Speed; any effect values.
  - D1 armor: Damage reduction (doesn't scale with power), health, effect values, and the enchantment effect texts at their tiers.
  - D2: tier effects with their values; no power numbers. It says plainly: "Power-level scaling numbers aren't documented on the wiki yet, so only effect tiers are shown."
- **Approximate badge** (gold outline chip, with a tooltip explaining why) whenever any shown number came from a curve or extrapolation instead of the item's own documented table.

### Math (`src/lib/forge/`)
- `damageAt(item, power)`:
  1. If `item.powerTable` has ≥ 2 points and `power` lies within its range: **log-linear interpolation** between the two neighboring points (interpolate `ln(min)` and `ln(max)` linearly in power). Exact.
  2. If `power` is outside the table range, or the table has < 2 points: scale the nearest documented point by the item's `weaponType` curve (from `data/forge/d1/curves.json`), falling back to the global kind curve. **Approximate.**
  3. If there's no table at all: weapons start from the 0–14 damage rating × the per-kind **baseline** (median power-1 damage per rating point, stored in `curves.json`; the rating itself is not a damage value, D-085) × the curve. Armor uses the median health curve. **Approximate.**
- Enchantment modifiers: only an enchantment whose every tier text is a bare "+N% damage" and whose description names no condition is applied, multiplicatively (on the real D1 data: **Sharpness** and **Power**, D-086). Everything else that mentions damage (Smiting vs. the Undead, Committed vs. wounded mobs, Supercharge on charged shots …) is a separate "Situational" line, never folded into the main number. Effects with no damage percentage show their tier text. Built-in enchantments are locked rows; their tier is not documented, so they never change a number (D-088). Points are cumulative: tier III costs I + II + III.
- Every function is pure and unit-tested against at least 3 real `powerTable` points per test item: interpolation must reproduce the documented endpoints exactly.

## 3. Compare
- Works for every category except the D1 DLCs (D2 Quests *are* comparable, D-091).
- Holds 2–4 items of **one** category. Selection lives in `localStorage['dc:compare:{game}']` (`{ category, slugs }`) and in the URL on the compare page (`?c=weapons&items=a,b&diff=true`); the URL wins when it has items, otherwise the stored selection is shown (D-093).
- Add from cards (⇄ toggle button), detail pages, or the search palette. A 5th add shows a toast: "Compare holds up to 4. Remove one first." Adding an item of another category asks first through a toast action, "Start a new comparison".
- A sticky **tray** at the bottom of a category page shows the selection (thumbnails you can click to remove, `n/4 selected`, Compare, Clear).
- The table shows sticky item headers (icon, name, remove ✕) and a sticky label column. Rows come from the category config's `compareRows` (numbers, booleans, text, and lists such as properties and effects) plus an automatic Rarity row. For numeric rows the best value is highlighted (higher is better unless the row says `better: 'low'`, like cooldown) with a ◆ and "(best)" text. A "Differences only" switch hides identical rows. "+ Add item" is a combobox scoped to the category. Mobile shows 2 columns with a horizontal scroll and snap. The category's data is one static file, `public/compare/{game}/{category}.json`, fetched when the category is chosen (D-090).

## 4. Favorites
- A ★ toggle on every card and detail page. It's stored in `localStorage['dc:favorites:v1']` as `string[]` of entity ids, through the safe storage wrapper (try/catch; works as a no-op when storage is blocked).
- The header shows the count (live, from the same store); `/favorites` lists them under Dungeons / Dungeons II tabs, grouped by category, as the usual cards (names and icons from `public/search/{game}.json`). Backup menu: Export JSON (`dungeons-codex-favorites.json`) / Import JSON (every id validated with Zod, ids the data no longer has are skipped, then Merge or Replace).
- Cross-tab sync uses the `storage` event. Storage that is blocked still works for the page view (D-092).

## 5. Build Planner
**D1 build slots:** Melee, Ranged, Armor, Artifact ×3. Each gear item has 3 enchantment slots with tiers; there's a power level and an optional build name and notes (≤ 280 chars).
**D2 build slots (confirmed on the wiki in Prompt 05, D-051):** Melee, Ranged, Helmet, Chestplate, Leggings, Boots, Artifact ×3, Talisman ×3 (12 equipment items in all; `Dungeons II:Inventory` states 6 equipment slots, three artifact slots and three talisman slots, and `Dungeons II:Talisman` "up to three talismans can be equipped at once"). Every weapon and armor piece holds **at most one** enchantment (`Dungeons II:Enchanting`: "Each enchantable item can only hold one enchantment"), which can be upgraded to tier III; artifacts and talismans take no enchantments. So a D2 gear slot has **one** enchantment slot (not three) with a tier I/II/III selector; talismans have a tier selector (their level I–III) and no power level or rarity, and the same artifact cannot be equipped twice. The wiki documents no D2 power scaling (see §2), so the planner's D2 summary lists effects and tiers only. Prompt 12 builds exactly this.

- **Picker:** clicking a slot opens a Sheet/Dialog with that category's EntityCards plus the full filter panel (reusing the Category Browser components).
- **Summary panel:** total enchantment points; combined effect list (grouped by effect label, summing percentages when they're the same label and unit, with a note: "simple sum, in-game stacking may differ"); damage at the build's power for the chosen melee/ranged (through the Forge math, Approximate rules included).
- **Encoding:** `b` = base64url( JSON `{ v:1, g:'d1', n?:string, p?:number, s: { slotKey: [entitySlug, [[enchSlug, tier], …]] } }` ), compressed with a small deflate (`fflate`) when that's shorter. Decoding validates with Zod; invalid or unknown slugs are dropped and a toast says so. URL ≤ 2,000 chars.
- **Actions:** Copy link, Save to "My builds" (localStorage, max 50), Duplicate, Clear, Open each item.
- **Validation:** an item in the wrong slot is impossible (pickers are scoped). Duplicate artifacts get a warning (the game doesn't allow the same artifact twice).

## 6. Theme
- `dark` (default, "Dungeon Night") and `light` ("Parchment"). The toggle is in the header and supports Light, Dark and System.
- Stored in `localStorage['dc:theme']`. The inline head script sets `data-theme` before paint. Every color comes from tokens; there are no hard-coded hex values in components (ESLint/regex check in Prompt 13).
- Per-game accent: the `<div data-game>` wrapper rendered by the `(site)` and `[game]` layouts; `d1` uses emerald, `d2` uses frost cyan. See the Design tokens.

## 7. Cross-cutting UX
- Loading: skeleton cards. Errors: friendly EmptyState components. Toasts for copy/save actions (Radix Toast).
- Every interactive element has visible focus (a 3 px accent ring), a 44×44 px minimum touch target, and an `aria-label` when it's icon-only.
- `prefers-reduced-motion` turns off parallax, the reveal-on-scroll animation and number tickers.
