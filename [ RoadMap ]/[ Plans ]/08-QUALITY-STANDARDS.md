# 08: Quality Standards & Verification

## Code conventions
- TypeScript strict; no `any`, no `@ts-ignore` (use `@ts-expect-error` with a reason, only in tests).
- Server Components by default. `'use client'` only on interactive leaves (filters, forge, compare, planner, search, theme, favorites).
- Files hold one component each and stay ≤ 250 lines; split anything bigger. Named exports for components, PascalCase file names for components, camelCase for libs.
- Styling: Tailwind utilities with token CSS variables (`bg-[--surface-1]` or theme-mapped utilities from `@theme`). **No hex colors in `src/`** outside `styles/`.
- Class merging through `cn()` (`clsx` + `tailwind-merge`).
- No `console.log` in `src/` (ESLint `no-console`, except `warn` and `error`).
- Pure logic goes in `src/lib/**`, framework-free and unit-tested.
- Imports use the `@/` alias for `src/`.
- Comments explain *why*, not *what*.

## Testing requirements
| Layer | Tool | Minimum |
|---|---|---|
| `src/lib/**` (filters, forge, planner codec, storage, utils) | Vitest | ≥ 90 % line coverage; filter engine and forge at 100 % branches |
| `scripts/**` parsers | Vitest + fixtures in `tests/fixtures/wiki/` | One test per parser, using real saved responses (trimmed), that checks ≥ 3 known entities field by field |
| Components | Vitest + Testing Library | TypeSelector, FilterPanel, RangeFilter, Compare table, Planner slot, ThemeToggle: render, interaction and a11y role checks |
| E2E | Playwright | See below |
| Accessibility | @axe-core/playwright | 0 serious/critical violations on: `/`, `/d1`, `/d2`, `/d1/weapons`, `/d2/armor`, one detail page per category type, `/d1/compare?…`, `/d1/planner`, `/favorites`, `/about`, 404 |

### Required E2E specs (`tests/e2e/`)
1. `picker.spec.ts`: `/` shows both game cards, and each card navigates to its hub.
2. `hub.spec.ts`: each hub shows its 8 correct sections with counts > 0.
3. `filters.spec.ts`: on `/d1/weapons`, choosing Melee → Daggers, setting a damage range and adding a property filter reduces results, updates the URL and survives a reload. The Back button restores the previous state. "Clear all" resets.
4. `detail.spec.ts`: a detail page renders the infobox, source credit and related items; Favorite toggles and persists across a reload.
5. `forge.spec.ts`: moving the power slider changes the damage number; adding Sharpness III raises it; the Approximate badge shows for an item without a table.
6. `compare.spec.ts`: adding 3 weapons, opening Compare, toggling "Differences only".
7. `planner.spec.ts`: building a full D1 build, copying the link, opening it in a new context, and checking the identical build renders.
8. `search.spec.ts`: Ctrl+K, type "clay", Enter goes to the Claymore page.
9. `theme.spec.ts`: toggling theme persists, and there's no flash (the `data-theme` attribute is present in the initial HTML response through the inline script).
10. `a11y.spec.ts`: an axe sweep over the route list above, in both themes.
11. `mobile.spec.ts` (viewport 390×844): the filter sheet opens and applies; the nav menu works; there's no horizontal scroll on any tested page.

## Performance budgets
- First-load JS for `/` is ≤ 120 kB gzip, and ≤ 180 kB for category pages (check the `next build` output).
- LCP < 2.5 s and CLS < 0.05 in Lighthouse mobile emulation.
- Images: `next/image` with explicit sizes; the hero uses `priority`; everything else is lazy.
- Fonts: `next/font/google` with `display: swap`, subset `latin`, only the weights we use.

## SEO
- Unique title and description per page, canonical URLs, sitemap, robots, OG images, BreadcrumbList JSON-LD, semantic headings (exactly one H1 per page), and descriptive link text.

## Verification commands (what "green" means)
Run from `PROJECT_ROOT`:
```bash
npm run verify
```
```bash
npm run e2e
```
`verify` must be green at the end of **every** prompt. `e2e` must be green from Prompt 06 onward for whichever specs exist by then (each prompt adds its own).

## The verification loop (used by every prompt)
```
repeat:
  1. run the prompt's acceptance commands
  2. if anything fails → read the full error → fix the root cause (no skipping, no disabling tests, no `eslint-disable` without a written reason) → go to 1
  3. go through the prompt's mini-checklist item by item and confirm each with evidence
     (file exists / test name / screenshot / command output)
  4. if any item can't be confirmed → do it → go to 1
until every acceptance command is green AND every checklist item is confirmed
```
Visual checks: start the dev server with the `run` skill or `preview_start`, take screenshots of the pages changed in the stage in **both themes** at **1440 px and 390 px**, and compare them with `[ Design ]/Plan/DESIGN-SYSTEM.md` and `[ Design ]/Wireframes/WIREFRAMES.md`. Fix any visual defects before you tick.

**Never** weaken a test or acceptance criterion to make it pass. If a criterion is truly impossible (for example, the wiki lacks the data), document why in `10-DECISIONS-LOG.md`, put the closest honest alternative in place, and note it in the Checklist log.
