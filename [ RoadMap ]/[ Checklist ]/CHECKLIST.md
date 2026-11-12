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
| 03 | Data core: schemas, wiki client, parsers | `03-DATA-CORE.md` | ⬜ | | |
| 04 | Dungeons 1 data (8 categories + images) | `04-DATA-DUNGEONS-1.md` | ⬜ | | |
| 05 | Dungeons II data (8 categories + images) | `05-DATA-DUNGEONS-2.md` | ⬜ | | |
| 06 | App shell, Game Picker, Hubs | `06-APP-SHELL-AND-NAVIGATION.md` | ⬜ | | |
| 07 | Category Browser & filters (16 pages) | `07-CATEGORY-BROWSER-AND-FILTERS.md` | ⬜ | | |
| 08 | Detail pages | `08-DETAIL-PAGES.md` | ⬜ | | |
| 09 | Codex Search | `09-SEARCH.md` | ⬜ | | |
| 10 | Power Forge | `10-POWER-FORGE.md` | ⬜ | | |
| 11 | Compare & Favorites | `11-COMPARE-AND-FAVORITES.md` | ⬜ | | |
| 12 | Build Planner | `12-BUILD-PLANNER.md` | ⬜ | | |
| 13 | Quality pass | `13-QUALITY-PASS.md` | ⬜ | | |
| 14 | Deploy readiness & handoff | `14-DEPLOY-AND-HANDOFF.md` | ⬜ | | |
| H | **Human:** GitHub + Vercel deploy | (below) | ⬜ | | |

**Progress:** 2 / 14 prompts · v1.0 not released

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
- [ ] 17 schema modules + registry
- [ ] Wiki client (cache, rate limit, retries), tested
- [ ] tables / templates / text helpers, tested
- [ ] Parser library decision logged
- [ ] Fixtures saved
- [ ] Infobox stat mapping documented
- [ ] Power table parser exact
- [ ] Loaders tested
- [ ] Validator tested
- [ ] Overrides loader tested
- [ ] User-Agent asserted

### 04: Dungeons 1 data
- [ ] Sync CLI
- [ ] 8 parsers
- [ ] Linking + derived fields
- [ ] Vocab reviewed
- [ ] Images + manifest
- [ ] Forge curves
- [ ] Full sync done
- [ ] Coverage ≥ 98 % × 8
- [ ] 10-entity spot check
- [ ] Parser tests × 8
- [ ] `data:validate` clean

### 05: Dungeons II data
- [ ] D2 schemas finalized (logged)
- [ ] D2 planner slot facts recorded
- [ ] 8 parsers
- [ ] Unobtainable flags; sets complete
- [ ] Talisman tiers parsed
- [ ] Quest rewards structured
- [ ] Vocab + images + empty curves
- [ ] Coverage ≥ 98 % × 8
- [ ] 10-entity spot check
- [ ] Parser tests × 8
- [ ] `data:validate` clean (d1 + d2)

### 06: App shell, Picker, Hubs
- [ ] Root layout + `(site)` and `[game]` shells
- [ ] Correct per-game accent in server HTML
- [ ] Header (sticky, switcher, nav, search btn, favorites, theme, mobile)
- [ ] Footer (legal text, sync date)
- [ ] Game Picker per wireframe
- [ ] Both hubs per wireframe
- [ ] 16 category stubs
- [ ] About, 404, Breadcrumbs + JSON-LD
- [ ] Metadata, sitemap, robots
- [ ] e2e + unit tests
- [ ] Visual check
- [ ] axe clean

### 07: Category Browser & filters
- [ ] Engine + DSL + URL codec (100 % branches, benchmark)
- [ ] Category config × 16
- [ ] Filter configs × 16
- [ ] Filter components + mobile sheet
- [ ] EntityCard + EntityTable
- [ ] URL state (share, reload, Back)
- [ ] Facet counts
- [ ] 16 pages static; DLC special case
- [ ] Minimal detail pages
- [ ] Budgets met
- [ ] e2e + 16-page sweep + axe
- [ ] Visual check

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
| 2026-11-12 | 02 Design system & UI kit | Tokens copied verbatim into `src/styles/tokens.css` and mapped into Tailwind v4 `@theme inline` (palette reset, `rounded-card` etc.); Rubik + Silkscreen via `next/font`; no-flash theme script + `ThemeProvider`/`ThemeToggle` + `safeStorage`; all 21 primitives (Button3D, Card, Panel, Chip, Badge, RarityFrame, StatBar, Slider, RangeSlider, Dialog, Sheet, Tabs, Tooltip, Popover, Select, Checkbox, Switch, Toast+`useToast`, Skeleton, EmptyState, SectionHeading) + WaveDivider, Reveal, Wordmark; `slugify`/`format`/`cn` (+twMerge groups); original logo, favicon, 1200×630 OG PNG (`scripts/og-default.tsx`), `.bg-stone`; `/dev/ui` showcase (404 in production). Contrast script found real failures (light-theme muted/faint/rarity/soul, redstone ink, focus ring, accent-text on `--bg-2`); fixed in both token files. Acceptance: `npm run verify` exit 0 (vitest **68 passed**, 12 files; `src/lib` 100 % lines/branches); `npm run e2e` **18 passed**, 22 skipped (dev-only); `E2E_DEV_SERVER=1 npx playwright test ui-kit` **22 passed** (axe 0 serious/critical in dark/light × D1/D2 on both viewports, press physics 5→7→2 px / −2 / +3 px, dialog focus trap, reduced motion verified: reveal opacity 1, skeleton and unique-shimmer `animation: none`); `npx tsx scripts/contrast.ts` **272/272**. Visual check of `/dev/ui` at 1440 and 390 px, dark/light × D1/D2, plus dialog, select, toast, tooltip, popover and sheet. Decisions D-023…D-031 (token changes, Tailwind mapping, portal `data-game` note for Prompt 06, dev-only e2e mode that Prompt 13 must run). Ideas added: sheet swipe-follow, tooltip long-press. |
| 2026-11-12 | 01 Foundation | Git repo on `main` (root `.gitignore`); Next.js 16.4.6 app scaffolded at `dungeons-codex/` with exact-pinned deps, TS strict flags, ESLint/Prettier/Vitest/Playwright configs, all npm scripts (data stubs), folder skeleton, MIT + CC BY-NC-SA licenses, README stub, minimal page + `cn()` smoke tests. Acceptance: `npm run verify` exit 0 (tsc, eslint, prettier clean; vitest 1 passed; data:validate empty-ok; next build static `/`); `npm run e2e` 2 passed (chromium + mobile 390×844; H1 font-size 36px proves Tailwind). **Path smoke test passed in place, no relocation.** Decisions D-016…D-022 (Next 16 scaffold changes, @types/node 22, versions). Ideas added: none. |
| 2026-11-12 | Planning | RoadMap created: Plans (00–10), Design (system, tokens, wireframes, references, ideas), Prompts (00 protocol + 01–14), Checklist. Decisions D-001…D-015 confirmed with the user. |
