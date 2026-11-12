# ✅ Dungeons Codex: Master Checklist

> **Trigger phrase:** *"Check the Checklist and continue with the next prompt"*
>
> When you (Claude) see that phrase, or any request to continue the project:
> 1. Read this file top to bottom.
> 2. Find the **first** stage in the Status Board that isn't ✅.
>    - If it's 🟡 **In progress**, a previous session stopped partway. Follow `[ Prompts ]/00-PROMPT-PROTOCOL.md` §E (resume).
>    - If it's ⬜ **Not started**, open the matching file in `[ Prompts ]/` and follow `00-PROMPT-PROTOCOL.md` from §A.
> 3. Run that one prompt to completion: every mini-checklist item confirmed and every acceptance command green.
> 4. Update this file (status, ticks, log), commit, and report.
> 5. **Stop after one prompt.** The user starts the next one with the trigger phrase again.
>
> **Never ask the user questions during a prompt.** Use the Decision Rules in `[ Plans ]/10-DECISIONS-LOG.md`.
> **Only** the steps under **Human-only steps** need the user.

---

## 📁 Paths
| Name | Path |
|---|---|
| Workspace (git root) | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]` |
| **PROJECT_ROOT** (Next.js app) | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]\dungeons-codex` |
| RoadMap | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]\[ RoadMap ]` |
| Plans (source of truth) | `[ RoadMap ]\[ Plans ]\00-INDEX.md` |
| Design | `[ RoadMap ]\[ Design ]\README.md` |
| Prompts | `[ RoadMap ]\[ Prompts ]\` |

> If Prompt 01 relocates the app because of the bracketed path, update **PROJECT_ROOT** here. Every later prompt reads it from this block.

---

## 🧭 Before the first run (one-time, for the user)
- [ ] Open Claude Code **in the workspace folder** (`[ Dungeons Wiki ]`) so `CLAUDE.md` loads.
- [ ] Pick a permission mode that lets Claude run `npm`, `npx`, `git` and file edits without asking every time (for example *Auto* / *Accept edits*, plus allowing Bash and PowerShell commands). Otherwise prompts will pause on permission dialogs.
- [ ] Make sure **Node.js 22 LTS** and **Git** are installed (`node -v`, `git --version`). Prompt 01 checks this too.

---

## 📊 Status Board
Legend: ⬜ Not started · 🟡 In progress · ✅ Done

| # | Stage | Prompt file | Status | Date | Commit |
|---|---|---|---|---|---|
| 01 | Foundation: repo, scaffold, tooling, path test | `01-FOUNDATION.md` | ✅ | 2026-11-12 | see git log |
| 02 | Design system & UI kit | `02-DESIGN-SYSTEM.md` | ✅ | 2026-11-12 | see git log |
| 03 | Data core: schemas, wiki client, parsers | `03-DATA-CORE.md` | ✅ | 2026-11-12 | see git log |
| 04 | Dungeons 1 data (8 categories + images) | `04-DATA-DUNGEONS-1.md` | ✅ | 2026-11-12 | see git log |
| 05 | Dungeons II data (8 categories + images) | `05-DATA-DUNGEONS-2.md` | ✅ | 2026-11-12 | see git log |
| 06 | App shell, Game Picker, Hubs | `06-APP-SHELL-AND-NAVIGATION.md` | ✅ | 2026-11-12 | see git log |
| 07 | Category Browser & filters (16 pages) | `07-CATEGORY-BROWSER-AND-FILTERS.md` | ✅ | 2026-11-12 | see git log |
| 08 | Detail pages | `08-DETAIL-PAGES.md` | ⬜ | | |
| 09 | Codex Search | `09-SEARCH.md` | ⬜ | | |
| 10 | Power Forge | `10-POWER-FORGE.md` | ⬜ | | |
| 11 | Compare & Favorites | `11-COMPARE-AND-FAVORITES.md` | ⬜ | | |
| 12 | Build Planner | `12-BUILD-PLANNER.md` | ⬜ | | |
| 13 | Quality pass | `13-QUALITY-PASS.md` | ⬜ | | |
| 14 | Deploy readiness & handoff | `14-DEPLOY-AND-HANDOFF.md` | ⬜ | | |
| H | **Human:** GitHub + Vercel deploy | (below) | ⬜ | | |

**Progress:** 7 / 14 prompts · v1.0 not released

---

## 🔁 Stage details (tick here **and** in the prompt file)

### 01: Foundation
- [x] Node/npm/git versions logged
- [x] git repo on `main` with root `.gitignore`
- [x] Next.js scaffolded; exact versions pinned and logged
- [x] TS strict flags
- [x] All deps + Playwright Chromium installed
- [x] ESLint / Prettier / Vitest / Playwright configs
- [x] All npm scripts (data stubs)
- [x] Folder skeleton
- [x] License files
- [x] Unit + e2e smoke tests pass
- [x] Path smoke test result logged
- [x] README stub

### 02: Design system & UI kit
- [x] Tokens copied + mapped into Tailwind
- [x] Fonts
- [x] No-flash theme + toggle + safeStorage
- [x] 21 primitives + WaveDivider + Reveal
- [x] Utilities tested
- [x] Brand assets (original)
- [x] `/dev/ui` showcase (404 in prod)
- [x] Contrast script passes
- [x] Component tests + theme e2e
- [x] Visual check (themes × accents × widths)
- [x] Reduced motion verified

### 03: Data core
- [x] 17 schema modules + registry
- [x] Wiki client (cache, rate limit, retries), tested
- [x] tables / templates / text helpers, tested
- [x] Parser library decision logged
- [x] Fixtures saved
- [x] Infobox stat mapping documented
- [x] Power table parser exact
- [x] Loaders tested
- [x] Validator tested
- [x] Overrides loader tested
- [x] User-Agent asserted

### 04: Dungeons 1 data
- [x] Sync CLI
- [x] 8 parsers
- [x] Linking + derived fields
- [x] Vocab reviewed
- [x] Images + manifest
- [x] Forge curves
- [x] Full sync done
- [x] Coverage ≥ 98 % × 8
- [x] 10-entity spot check
- [x] Parser tests × 8
- [x] `data:validate` clean

### 05: Dungeons II data
- [x] D2 schemas finalized (logged)
- [x] D2 planner slot facts recorded
- [x] 8 parsers
- [x] Unobtainable flags; sets complete
- [x] Talisman tiers parsed
- [x] Quest rewards structured
- [x] Vocab + images + empty curves
- [x] Coverage ≥ 98 % × 8
- [x] 10-entity spot check
- [x] Parser tests × 8
- [x] `data:validate` clean (d1 + d2)

### 06: App shell, Picker, Hubs
- [x] Root layout + `(site)` and `[game]` shells
- [x] Correct per-game accent in server HTML
- [x] Header (sticky, switcher, nav, search btn, favorites, theme, mobile)
- [x] Footer (legal text, sync date)
- [x] Game Picker per wireframe
- [x] Both hubs per wireframe
- [x] 16 category stubs
- [x] About, 404, Breadcrumbs + JSON-LD
- [x] Metadata, sitemap, robots
- [x] e2e + unit tests
- [x] Visual check
- [x] axe clean

### 07: Category Browser & filters
- [x] Engine + DSL + URL codec (100 % branches, benchmark)
- [x] Category config × 16
- [x] Filter configs × 16
- [x] Filter components + mobile sheet
- [x] EntityCard + EntityTable
- [x] URL state (share, reload, Back)
- [x] Facet counts
- [x] 16 pages static; DLC special case
- [x] Minimal detail pages
- [x] Budgets (payload met; first-load JS: documented alternative, D-076)
- [x] e2e + 16-page sweep + axe
- [x] Visual check

### 08: Detail pages
- [ ] Static detail route
- [ ] DetailLayout
- [ ] All section components
- [ ] Infobox + SourceCredit
- [ ] Two-way cross-links
- [ ] Partial-data handling
- [ ] Metadata + JSON-LD + OG images
- [ ] Sitemap count
- [ ] Tests + sweep + axe
- [ ] Visual check

### 09: Codex Search
- [ ] Index + prebuild + aliases (≤ 60 kB gz)
- [ ] Search lib tested
- [ ] Palette complete
- [ ] Entry points wired
- [ ] e2e + axe
- [ ] Visual check

### 10: Power Forge
- [ ] Math modules, 100 % branches
- [ ] Documented points exact
- [ ] Forge UI (D1 weapons, D1 armor, D2)
- [ ] TierViewer (enchantments, talismans)
- [ ] Approximate badges
- [ ] Share + Reset
- [ ] Lazy + fast
- [ ] Tests + axe
- [ ] Visual check

### 11: Compare & Favorites
- [ ] SSR-safe stores
- [ ] Actions wired everywhere
- [ ] Compare tray
- [ ] Compare page complete
- [ ] Data delivery logged
- [ ] Favorites page + backup
- [ ] Header count live
- [ ] No hydration warnings
- [ ] Tests + axe
- [ ] Visual check

### 12: Build Planner
- [ ] Slot defs D1 + D2
- [ ] Codec (≤ 2,000 chars), 100 % branches
- [ ] Summary math
- [ ] Planner UI complete
- [ ] Open in Planner
- [ ] My builds
- [ ] Tests + axe (D1 + D2)
- [ ] Visual check

### 13: Quality pass
- [ ] 11 e2e specs green, no retries
- [ ] axe matrix clean
- [ ] Keyboard pass
- [ ] Lighthouse targets
- [ ] JS budgets
- [ ] Responsive matrix
- [ ] Design fidelity + no-hex check
- [ ] SEO checks
- [ ] 20 + 20 data audit
- [ ] Legal checks
- [ ] Edge states
- [ ] Code health
- [ ] Code review addressed

### 14: Deploy readiness & handoff
- [ ] Clean-clone build
- [ ] Security headers + CSP
- [ ] README
- [ ] MAINTAINING.md
- [ ] CLAUDE.md updated
- [ ] Release audit all pass
- [ ] Human steps verified + printed
- [ ] `v1.0.0` tag

---

## 🙋 Human-only steps (do these after Prompt 14; ~5 minutes)
Claude doesn't do these (decision D-010).

**H1. Create the GitHub repo and push**
1. Go to https://github.com/new. Name: `dungeons-codex`. Visibility: Public (or Private). **Don't** add a README, .gitignore or license (they already exist).
2. In a terminal in the workspace folder (`[ Dungeons Wiki ]`):
   ```bash
   git remote add origin https://github.com/<your-username>/dungeons-codex.git
   ```
   ```bash
   git push -u origin main --tags
   ```

**H2. Deploy on Vercel**
1. Go to https://vercel.com/new and sign in with GitHub. Import `dungeons-codex`.
2. **Root Directory** → click *Edit* → choose `dungeons-codex`. Framework preset: Next.js (auto). Leave the build settings at their defaults.
3. Click **Deploy**. Wait for it to finish, then copy the production URL (e.g. `https://dungeons-codex.vercel.app`).
4. Project → Settings → Environment Variables: add `NEXT_PUBLIC_SITE_URL` = your production URL (Production). Then Deployments → ⋯ → **Redeploy**.
5. Tick **H** in the Status Board. From now on, every `git push` to `main` deploys automatically.

**H3. (Later) Refreshing data**
Say to Claude: *"Refresh the Dungeons Codex data from the wiki following MAINTAINING.md, verify, and commit."* Then `git push`.

---

## 📝 Log
Newest first. Each entry: date · stage · summary · acceptance results (summary lines) · decisions logged · ideas added.

| Date | Stage | Entry |
|---|---|---|
| 2026-11-12 | 07 Category Browser & filters | Filter engine in `src/lib/filters/` (tokens, path DSL `a.b` / `arr[key=value].prop`, `applyFilters`, `facetCounts`, `sortItems`, range bounds with the missing-field rule, URL codec with negative ranges, state helpers, option/label resolution, build-time derived fields) with **100 % statements/branches/functions/lines** (440/440 branches) and the 1,000 × 12 benchmark (< 10 ms median). Config for all 16 pairs (`config/categories.ts` + `display/`, `config/filters/{d1,d2}/`), checked against the real data by `category-config.test.ts` (params unique, every field exists, sorts and columns line up, payload < 150 kB). Components: `TypeSelector` (2 levels, counts, arrow keys, searchable picker above 30 options), `FilterPanel`, `RangeFilter`, `MultiFilter` (search above 8), `ToggleFilter`, `ActiveFilterChips` + Clear all, `SortMenu`, `ViewToggle` (+ D2 "Group by set"), `ResultsCount` (`aria-live`), `FiltersSheet` ("Show n results" / "Clear"), `EntityCard` (one stretched link, reserved ★/⇄ slot), `EntityTable` (`aria-sort`), `QualityBadge`, `SourceCredit`. State lives in the URL through nuqs (chips/checkboxes/sort push, sliders/search/view replace); the static HTML holds the complete unfiltered card list as the Suspense fallback. All 16 category pages and 1,467 minimal detail pages are static (1,498 pages built); D1 DLCs are release-order cards without a filter panel. Acceptance: `npm run verify` exit 0 (vitest **667 passed**, 68 files; data:validate OK 1467 entities; `next build` 1,498 static pages); `npm run e2e` **330 passed**, 38 skipped (dev-only `/dev/ui` specs, desktop-only cases on the phone project), 0 failed (new: `filters.spec` 12 tests, `categories.spec` 16 pages × lists/first-chip/no-overflow/axe dark+light on both viewports, phone sheet + chip-scroll tests in `mobile.spec`; axe 0 serious/critical on all 16 pages in both themes). Budgets: list payload max 93 kB raw (D1 weapons); first-load JS measured with the new `scripts/dev/bundle-size.ts`: `/about` 198 kB, `/` 199 kB, category pages 231 kB gzip (+33 kB), so Plans §08's 120 / 180 kB cannot be met on the current shell and are carried to Prompt 13 with the levers listed in D-076. Visual check of `/d1/weapons`, `/d2/armor`, `/d1/enchantments`, `/d2/talismans` in dark and light at 1440 and 390 px, plus narrowed, table, grouped, picker and phone-sheet states. It found and fixed: the level-2 weapon types collapsing into a picker (chips up to 30 now), the filter sheet autofocusing its search box (it would open the phone keyboard; `SheetContent focusSheet`), the D2 damage-reduction range showing -25 (parser sign; now absolute, and a one-value range is hidden), URLs rejecting negative ranges, the chip accessible name reading "All5" (a real space now), a table overflowing at 390 px (names wrap) and a missing table corner radius. Existing specs adapted, not weakened: `hub.spec` (the stub text became an assertion that the real Results region renders), `loaders.test` (the list projection gained `builtInEnchantments` and `locations`). Decisions D-068…D-076 (tokens, derived fields, type rows, ranges, hiddenUntilOn, static island, cards/tables, minimal detail pages, JS budget). Plans §06 updated to the implemented model, §08 notes how to measure. Ideas added: remember view, last-added filter, toggle counts, compact cards, type icons, sentence search, `/` shortcut. |
| 2026-11-12 | 06 App shell, Picker, Hubs | Root layout (only html/body, fonts, theme script, providers, `NuqsAdapter`, `metadataBase`, title template) with `SiteShell` (skip link, header, `<main id="main">`, footer) rendered by `(site)/layout` (`data-game="d1"`) and `[game]/layout` (`data-game={game}`, `dynamicParams=false`, `GameBodySync` mirrors it onto `<body>` for portalled overlays = D-026). Sticky translucent `SiteHeader` (68 → 56 px after 24 px, `GameSwitcher` with `gameSwitchHref`, section links / "Sections" menu, Search button + Ctrl/⌘+K via `SearchProvider`, Favorites count badge, `ThemeToggle`, hamburger → Sheet). Footer with the exact disclaimer, license line and sync date. `/` Game Picker (night hero with torch glow and 12 floating real icons, search pill, `GameCard`s with collage, live counts and pointer tilt ≤ 4°, 6 feature cards with Reveal, waves). `/d1` and `/d2` hubs (hero band + synced chip, 8 tiles with data icons and counts, 8 featured uniques, DLC strip on d1, tools row). 16 category stubs plus placeholder `/favorites`, `/{game}/compare`, `/{game}/planner`. `/about`, 404, `Breadcrumbs` + BreadcrumbList JSON-LD, `pageMetadata`, `sitemap.ts` (20 URLs), `robots.ts`. Acceptance: `npm run verify` exit 0 (vitest **465 passed**, 54 files; data:validate OK 1467 entities; `next build` 31 static pages); `npm run e2e` **172 passed**, 26 skipped (dev-only `/dev/ui` specs and desktop-only cases on the phone project), 0 failed (new: `picker`, `hub`, `shell`, `mobile`, `seo`, `shell-a11y` specs; axe 0 serious/critical on `/`, `/d1`, `/d2`, `/about`, `/d1/weapons`, `/d2/quests` and a 404, both themes, both viewports, plus the open search dialog and menu sheet); `npx tsx scripts/contrast.ts` **296/296**. Visual check of `/`, `/d1`, `/d2`, `/about` and the 404 in dark and light at 1440 and 390 px, plus the Sections popover and the mobile sheet. It found and fixed: header overflow at 1440 (inline links now `2xl` only), the game card wider than a 360 px phone, "ENCHANTMENTS" overflowing its tile, the scroller's first card snapping to the screen edge, the Wordmark's missing space (accessible name) and `aria-label`s that did not contain their visible text (axe `label-content-name-mismatch`). Existing specs adapted (not weakened): `smoke.spec` (the hero wordmark is fluid, so it asserts uppercase/900 instead of 36 px), `theme.spec` (toggle reached through the menu on phones). Decisions D-062…D-067. Ideas added: hero parallax, scroller arrows, inline links from `xl`, recently viewed row. |
| 2026-11-12 | 05 Dungeons II data | D2 schemas finalized against the live pages first (Plans §4.1–4.8; `D2Enchantment`, `D2Artifact` and `D2Location` are no longer the D1 shapes, `ammo` is a number, weapons/armor gained `isUnique`/`baseItemId`/`variantIds`, quest `rewards[].randomFrom` is structured, `areas` on quests, `questIds`/`stations`/`subAreas` on locations) and the Build Planner slot facts recorded in `07-FEATURES-SPEC.md` §5 (12 items: Melee, Ranged, 4 armor, 3 artifacts, 3 talismans; **one** enchantment per gear piece). 8 D2 parsers in `scripts/parsers/d2/` (list tables for membership and columns, item/mob/location pages in batches of 50 for flavor text, spawn lists and sub-areas); base/unique pairs, 24 melee weapon families by a keyword table over the base name (plus `bow` / `crossbow`), the 4 unobtainable weapons flagged, 38 armor sets × 4 pieces all complete, talisman tiers keep their raw text, quest rewards split into first/subsequent with counted `randomFrom` pools. The pipeline is game-aware now: `link-d2.ts`, `deriveGame(data, game)`, per-game open enums and `quality`, validator checks for `questIds`/`obtaining`/`randomFrom[].from`, `data/forge/d2/curves.json = {}`, and a reviewed 27-tag keyword list in `data/vocab/d2/properties.json`. Acceptance: `data:sync --game all --category all --offline` OK, **0 requests**, and a second run leaves the sha1 of all of `data/generated`, `reports`, `vocab`, `forge` and the image manifest **unchanged** (no diff); `data:validate` OK (**1467 entities**, 16 files; d1 968 + d2 499); `npm run verify` exit 0 (vitest **421 passed**, 46 files; typecheck, lint, prettier and `next build` clean). Coverage (valid ÷ expected): weapons 84/84 (58 melee + 22 ranged + 4 unobtainable), armor 152/152, enchantments 32/32, artifacts 40/40, talismans 24/24, quests 42/42 (15 core + 27 side), mobs 109/109, locations 16/16 (9 main + 7 Rift areas), all 100.0 %; 451 + 1 images (0 missing); partials are honest gaps (2 weapons and 1 armor piece without flavor text, 69 mobs without health, 5 Rift areas without an image and 4 of them without a description). Unresolved references (raw text, listed): 3 secret-chest sources and the quest pool `The Deep Dark`; 'References dropped': 59 mob spawn areas that are zones, dungeons or boss arenas, not main locations (`Deep Dark` ×24, `Dungeon` ×9, `Rift` ×5, `Storm Generator`/`Monarch`/`Deadleaf Forest` ×4 each, …). Spot check (seeded 20261112, `scripts/dev/spotcheck.ts 20261112 d2`, against the live pages at the synced revisions): Twilight Dagger, Humbler Heartstring, Sculker Boots, Sculk Digger Hood, Cow Stampede, Conductive Quiver, Twisted Tooth, The Trembling Golem, Roamroot, Harlow's Village: all fields match; it found one parser gap (Roamroot's page uses the D1 `{{Infobox Dungeons entity}}`, so its three spawn locations were missed; fixed with `mobInfobox` and a test), and the tests found one armor piece whose table row has no icon (Soul Corruptor Sandals; the icon now falls back to the infobox image). Decisions D-051…D-061. Ideas added: D2 hit tables, D2 zones as locations, quest chains, set view, mob tiers, artifact types, tag review. |
| 2026-11-12 | 04 Dungeons 1 data | Sync CLI (`--game/--category/--images/--refresh/--offline`, pipeline parse → slugs → link → derive → overrides → property tags → images → quality → enum vocab → Zod → write, summary table), 8 D1 parsers (+ shared `items`/`common`), linking (names → ids via exact, case-insensitive, redirects; `itemIds`, `contentCounts`, `builtInto` symmetry, `related`), reviewed property vocab (239 strings → 38 tags), images (967 WebP files + sha1 manifest, alt "{name} icon"), Forge curves (`data/forge/d1/curves.json`), coverage reports. 968 entities. Acceptance: `data:sync --game d1 --category all --offline` OK, **0 requests**, re-run gives byte-identical `data/` + manifest (sha1 of all files equal before/after → deterministic); `data:validate` OK (968 entities, 8 files); `npm run verify` exit 0 (vitest **338 passed**, 36 files). Coverage: weapons 153/153, armor 71/71, enchantments 108/108, artifacts 45/45, dlcs 9/9, cosmetics 288/288, mobs 241/241, locations 53/53 (all 100.0 %; 8 dropped unimplemented/removed cosmetics listed; partials: 4 enchantments, 11 cosmetics, 123 mobs (health), 13 locations). Spot check (seeded, `scripts/dev/spotcheck.ts`, vs live pages at the synced revisions): Vine Whip, Freezing Foil, Souldancer Robe, Roll Charge, Enchanter's Tome, Creeping Winter, Tower Avatar (purple), Toucan, Powersmith, End Wilds: all fields match; Enchanter's Tome has no `dlc` because the wiki's list column "DLC exclusive" says ✖ (D-050), so no fix needed. Decisions D-039…D-050. Ideas added: sub dungeons, rarity pair, mob detail, minimum difficulty, gilded costs, cosmetic filters, upstream-mistakes note. |
| 2026-11-12 | 03 Data core | 17 Zod schema modules (`base` + 8 D1 + 8 D2, strict objects, id/image-path invariants, vocab-checked open enums) + `schemaFor` registry and types; `src/config/games.ts` (typed `CategorySlug<G>`, `isValidCategory`) and `categories.ts` (`LIST_FIELDS`, `GROUP_FIELD`); wiki client (1 req/s sequential queue, bot UA, `maxlag=5`, 2/4/8/16/32 s back-off on 429/5xx/maxlag/network, sha1 cache, `--refresh`/`--offline`) + `parsePageHtml`, `getWikitextBatch` (50/call, redirects, continue), `getImageInfo`, `searchTitle`, `resolveRedirects`; `tables.ts` (HTML wikitables with heading paths, rowspan/colspan, lines, links, images, sort values, divider-row sections; wikitext tables), `templates.ts` (custom scanner + `stripWikiMarkup`), `text.ts`, `statMap.ts`, `powerTable.ts`; server-only loaders (`getAll`, `getBySlug`, `getListItems`, `getCounts`, `getRelated`, `getByIds`, `getSyncDate`); real `data:validate` (schema, cross-refs, unresolved-reference list, images, order); overrides loader. 15 real fixtures (10 live requests total, all ≤ 174 kB). Acceptance: `npm run verify` exit 0 (vitest **232 passed**, 22 files; data:validate empty-ok; build OK); `npx vitest run tests/unit/scripts --coverage` **125 passed**, `scripts/wiki` **99.21 % stmts / 92.51 % branches / 99.81 % lines** (≥ 90 %). Stat mapping: melee Power/Speed/Area, ranged Power/Speed/Ammo (+ Charge), 0–14 scale, armor none — checked on 3 rendered infoboxes + 1 armor. Claymore power table parses exactly (power 1 → 18–19 / 32–34 → `{min 18, max 34}`). Decisions D-032…D-038 (schemas, **custom parser kept / wikiparser-node uninstalled** (same output, ~50× faster, GPL-3.0), stat map, power-table interpretation, client details, validator report format, overrides + test setup). Plans §3.1/§5 and pipeline doc updated. Ideas added: none. |
| 2026-11-12 | 02 Design system & UI kit | Tokens copied verbatim into `src/styles/tokens.css` and mapped into Tailwind v4 `@theme inline` (palette reset, `rounded-card` etc.); Rubik + Silkscreen via `next/font`; no-flash theme script + `ThemeProvider`/`ThemeToggle` + `safeStorage`; all 21 primitives (Button3D, Card, Panel, Chip, Badge, RarityFrame, StatBar, Slider, RangeSlider, Dialog, Sheet, Tabs, Tooltip, Popover, Select, Checkbox, Switch, Toast+`useToast`, Skeleton, EmptyState, SectionHeading) + WaveDivider, Reveal, Wordmark; `slugify`/`format`/`cn` (+twMerge groups); original logo, favicon, 1200×630 OG PNG (`scripts/og-default.tsx`), `.bg-stone`; `/dev/ui` showcase (404 in production). Contrast script found real failures (light-theme muted/faint/rarity/soul, redstone ink, focus ring, accent-text on `--bg-2`); fixed in both token files. Acceptance: `npm run verify` exit 0 (vitest **68 passed**, 12 files; `src/lib` 100 % lines/branches); `npm run e2e` **18 passed**, 22 skipped (dev-only); `E2E_DEV_SERVER=1 npx playwright test ui-kit` **22 passed** (axe 0 serious/critical in dark/light × D1/D2 on both viewports, press physics 5→7→2 px / −2 / +3 px, dialog focus trap, reduced motion verified: reveal opacity 1, skeleton and unique-shimmer `animation: none`); `npx tsx scripts/contrast.ts` **272/272**. Visual check of `/dev/ui` at 1440 and 390 px, dark/light × D1/D2, plus dialog, select, toast, tooltip, popover and sheet. Decisions D-023…D-031 (token changes, Tailwind mapping, portal `data-game` note for Prompt 06, dev-only e2e mode that Prompt 13 must run). Ideas added: sheet swipe-follow, tooltip long-press. |
| 2026-11-12 | 01 Foundation | Git repo on `main` (root `.gitignore`); Next.js 16.4.6 app scaffolded at `dungeons-codex/` with exact-pinned deps, TS strict flags, ESLint/Prettier/Vitest/Playwright configs, all npm scripts (data stubs), folder skeleton, MIT + CC BY-NC-SA licenses, README stub, minimal page + `cn()` smoke tests. Acceptance: `npm run verify` exit 0 (tsc, eslint, prettier clean; vitest 1 passed; data:validate empty-ok; next build static `/`); `npm run e2e` 2 passed (chromium + mobile 390×844; H1 font-size 36px proves Tailwind). **Path smoke test passed in place, no relocation.** Decisions D-016…D-022 (Next 16 scaffold changes, @types/node 22, versions). Ideas added: none. |
| 2026-11-12 | Planning | RoadMap created: Plans (00–10), Design (system, tokens, wireframes, references, ideas), Prompts (00 protocol + 01–14), Checklist. Decisions D-001…D-015 confirmed with the user. |
