# 02: Tech Stack & Architecture

## Stack (locked)
| Concern | Choice | Notes |
|---|---|---|
| Runtime | Node.js **22 LTS** | Check with `node -v`; if it's < 22 and can't be upgraded, Node 20 LTS is acceptable (log the decision) |
| Package manager | **npm** | Lockfile committed. No pnpm/yarn |
| Framework | **Next.js (latest stable, ≥ 15) App Router** + **React 19** | Static generation for every page (`generateStaticParams`), deployed on Vercel. Do **not** use `output: 'export'` (we want `next/image` optimization on Vercel) |
| Language | **TypeScript**, `strict: true`, `noUncheckedIndexedAccess: true` | No `any` in `src/` (ESLint enforces it) |
| Styling | **Tailwind CSS v4** + CSS variables from `[ Design ]/Tokens/tokens.css` | Tokens are the single source of colors, radii, shadows |
| UI primitives | **Radix UI** (`@radix-ui/react-*`: Dialog, Slider, Tabs, Tooltip, Toggle Group, Popover, Checkbox, Select) | Accessible by default; styled by us |
| Icons | **lucide-react** | UI icons only; game icons are images |
| Schemas | **Zod** | One schema per category; TS types are inferred from it |
| URL state | **nuqs** | Filters, sort, view, compare items and builds live in the URL |
| Search | **FlexSearch** (client) + build-time index JSON | Command palette via **cmdk** |
| Scraping | Node scripts with **tsx**, global `fetch`, **cheerio** (HTML tables), **wikiparser-node** *or* a small custom template parser for `{{Infobox …}}` (Prompt 03 decides after testing on 5 pages; log the result) | Runs locally only (`npm run data:sync`), never during the Vercel build |
| Images | **sharp** → WebP, plus `next/image` | Self-hosted under `public/images/` |
| Unit tests | **Vitest** + **@testing-library/react** + **jsdom** | |
| E2E / a11y | **Playwright** (Chromium) + **@axe-core/playwright** | Installed per project: `npx playwright install chromium` |
| Lint/format | ESLint (`next/core-web-vitals`, `@typescript-eslint/strict`) + **Prettier** (+ `prettier-plugin-tailwindcss`) | |
| Hosting | **Vercel** (Hobby/free) | Project root directory = `dungeons-codex` |
| VCS | **git**, repo root = workspace root (`[ Dungeons Wiki ]`), branch `main` | The user creates the GitHub remote (human-only step) |

**Version pinning:** at scaffold time, install the latest stable versions, then pin **exact** versions in `package.json` (no `^` or `~`). Record the installed versions in `10-DECISIONS-LOG.md`.

## Repository layout
```
[ Dungeons Wiki ]/                 ← git repo root
├─ CLAUDE.md                       ← points every session at the RoadMap
├─ .gitignore
├─ [ RoadMap ]/                    ← plans, design, prompts, checklist (committed)
└─ dungeons-codex/                 ← PROJECT_ROOT (the Next.js app)
   ├─ package.json
   ├─ next.config.ts
   ├─ tsconfig.json
   ├─ vitest.config.ts
   ├─ playwright.config.ts
   ├─ eslint.config.mjs
   ├─ .prettierrc
   ├─ public/
   │  ├─ images/{d1,d2}/{category}/{slug}.webp
   │  └─ brand/ (logo.svg, favicon, og-default.png)
   ├─ data/
   │  ├─ generated/{d1,d2}/{category}.json   ← committed, the site reads ONLY these
   │  ├─ generated/{d1,d2}/search-index.json ← built by data:index
   │  ├─ overrides/{d1,d2}/{category}.json   ← committed manual corrections (with source URL)
   │  ├─ vocab/{d1,d2}/properties.json       ← normalized property/tag vocabulary
   │  ├─ forge/{d1,d2}/curves.json           ← Power Forge scaling data
   │  ├─ reports/coverage-{d1,d2}.md         ← committed coverage reports
   │  └─ raw-cache/                          ← GITIGNORED wiki API response cache
   ├─ scripts/
   │  ├─ wiki/            client.ts (rate-limited, cached API client), templates.ts, tables.ts
   │  ├─ parsers/{d1,d2}/{category}.ts
   │  ├─ images.ts        download + convert to WebP
   │  ├─ sync.ts          entry: npm run data:sync -- --game d1 --category weapons
   │  ├─ validate.ts      entry: npm run data:validate
   │  ├─ index.ts         entry: npm run data:index (search index)
   │  └─ coverage.ts      writes reports
   ├─ src/
   │  ├─ app/                         ← routes (see 05-ROUTES-AND-PAGES.md)
   │  ├─ components/
   │  │  ├─ ui/          Button3D, Card, Chip, Badge, RarityFrame, Slider, RangeSlider, Dialog, Sheet, Tabs, Tooltip, Toggle, Skeleton, EmptyState
   │  │  ├─ layout/      SiteHeader, SiteFooter, GameSwitcher, Breadcrumbs, ThemeToggle, SectionGrid, Hero, WaveDivider
   │  │  ├─ entity/      EntityCard, EntityTable, Infobox, StatBar, PropertyList, RelatedGrid, SourceCredit, QualityBadge
   │  │  ├─ filters/     TypeSelector, FilterPanel, RangeFilter, MultiFilter, ToggleFilter, ActiveFilterChips, SortMenu, ViewToggle
   │  │  └─ features/    forge/, compare/, favorites/, planner/, search/
   │  ├─ config/
   │  │  ├─ games.ts          game metadata + category lists (the 8+8 sections)
   │  │  ├─ categories.ts     per-category display config (labels, icons, card fields, table columns)
   │  │  └─ filters/{d1,d2}/{category}.ts   declarative FilterDefs
   │  ├─ lib/
   │  │  ├─ data/        loaders (server-only): getAll, getBySlug, getRelated, getCounts
   │  │  ├─ schemas/     zod schemas (shared with scripts/)
   │  │  ├─ filters/     pure filter engine + URL codec
   │  │  ├─ forge/       pure scaling math
   │  │  ├─ planner/     build encode/decode, enchantment-point math
   │  │  ├─ storage/     safe localStorage wrapper
   │  │  └─ utils/       slugify, format, cn()
   │  └─ styles/globals.css   ← imports tokens.css + Tailwind
   └─ tests/
      ├─ unit/        mirrors src/lib and scripts/
      ├─ fixtures/    saved wiki responses for parser tests (small, committed)
      └─ e2e/         Playwright specs
```

**Path safety:** the workspace path contains `[`, `]` and spaces. All config globs must be **relative** (never absolute), and tool calls in scripts must quote paths. Prompt 01 runs a smoke test (Tailwind picks up classes, Vitest finds tests, ESLint lints `src/`, `next build` succeeds). If any tool fails *because of the path*, relocate `PROJECT_ROOT` to `C:\dev\dungeons-codex`, make that its own git repo, update the Checklist **Paths** block, and log the decision.

## Rendering & data flow
```
minecraft.wiki API ──(npm run data:sync, local, rate-limited, cached)──► data/raw-cache
        │ parsers (+ overrides merge) ──► zod validate ──► data/generated/*.json (committed)
        │ images.ts ──► public/images/*.webp (committed)
        ▼
next build (Vercel) reads ONLY data/generated + public/images
  • server loaders (src/lib/data) read JSON at build time → typed objects
  • every route is statically generated with generateStaticParams
  • category pages get a slim "list projection" of entities as props; filtering runs client-side (pure engine)
  • detail pages are fully static; Forge/Compare/Planner are client components
```
- Loader modules start with `import 'server-only'`.
- The list projection type is `EntityListItem` (id, slug, name, image, rarity, plus only the fields used by that category's filters and cards). This keeps page payloads small.
- Search index: built by `npm run data:index` into `data/generated/{game}/search-index.json`, copied to `public/search/{game}.json`, and lazy-loaded when the palette opens.

## npm scripts (exact names, used by every prompt)
| Script | Does |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `next start` |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` |
| `test` | `vitest run` |
| `e2e` | `playwright test` (starts `next start` on port 3100 via `webServer`) |
| `data:sync` | `tsx scripts/sync.ts` (flags: `--game d1\|d2`, `--category <slug>\|all`, `--images`, `--refresh` to bypass cache) |
| `data:validate` | `tsx scripts/validate.ts` (zod-validates every generated file and checks cross-references) |
| `data:index` | `tsx scripts/index.ts` |
| `data:coverage` | `tsx scripts/coverage.ts` |
| `verify` | `npm run typecheck && npm run lint && npm run format:check && npm run test && npm run data:validate && npm run build` |

## Environment
- No secrets and no `.env` needed. The site is fully static.
- `NEXT_PUBLIC_SITE_URL` (optional, defaults to `http://localhost:3000`) is used for absolute URLs in the sitemap and OG tags. It is set in Vercel after deploy (human step).
