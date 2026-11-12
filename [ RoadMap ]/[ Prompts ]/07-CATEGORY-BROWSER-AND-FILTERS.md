# Prompt 07: Category Browser & Filter Engine (all 16 categories)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 06.
**Read first:** `[ Plans ]/06-FILTERS-SPEC.md` (all of it), `05-ROUTES-AND-PAGES.md` (Category Browser), `03-CONTENT-MODEL.md` §6; `[ Design ]/Wireframes/WIREFRAMES.md` §3; `DESIGN-SYSTEM.md` §6–7.

## Goal
Every `/[game]/[category]` page has the type-first selector, the full filter panel, sort, grid/table views, URL-synced state, facet counts and a mobile sheet. It's fast, accessible and fully tested.

## Tasks
1. **Filter engine** (`src/lib/filters/`): `types.ts` (FilterDef/SortDef/Cond exactly as in 06), `path.ts` (the dot-path DSL `a.b`, `arr[key=value].prop`, arrays flattened for `multi`), `engine.ts` (`applyFilters`, `facetCounts`, `sortItems`, range-bounds computation, missing-field rule), `url.ts` (`parseState`, `serializeState`; ranges as `min-max`, multis comma-separated and URL-safe, toggles as `1`; invalid values dropped). **100 % branch coverage**, plus the 1,000×12 benchmark test (< 10 ms).
2. **Category config** (`src/config/categories.ts`): for all 16 game/category pairs: label, intro line, hub icon entity slug, `listFields`, `cardFields` (≤ 2 stats), `tableColumns`, `compareRows` (used in Prompt 11), `detailSections` (used in 08), plus a default sort.
3. **Filter configs** (`src/config/filters/{d1,d2}/{category}.ts`): implement every table in 06 exactly. Options are `'auto'` → derived from data with labels from the vocab/enums. Type-1 options are always shown in a defined order (for example Melee before Ranged; D2 armor in slot order).
4. **Components** (`src/components/filters/`): `TypeSelector` (level-1 chips + level-2 chips revealed under the chosen level-1; horizontally scrollable on mobile with snap; counts; `aria-pressed`; keyboard arrows), `FilterPanel` (collapsible groups, `showWhen`, "n items without this stat are hidden" notes), `RangeFilter`, `MultiFilter` (searchable when it has more than 8 options; muted zero-count options), `ToggleFilter`, `ActiveFilterChips` + Clear all, `SortMenu`, `ViewToggle`, `ResultsCount` (`aria-live="polite"`), and a `FiltersSheet` for mobile with "Show n results" and "Clear" footer buttons.
5. **Entity components** (`src/components/entity/`): `EntityCard` (per Design §7: one link; it takes an optional `actions` render prop for the corner slot, rendered empty for now and filled with ★ and ⇄ in Prompt 11; the corner slot's space is reserved in the layout so nothing shifts later), `EntityTable` (sortable headers bound to the same sort state, `aria-sort`), `QualityBadge`, `EmptyState` usage.
6. **Page** `app/[game]/[category]/page.tsx`: replaces the stubs from Prompt 06. Server: `getListItems` → props. Client `CategoryBrowser` handles state through nuqs (`shallow: true`; history `replace` for slider drags, `push` for chip/toggle changes so Back works), and memoizes `applyFilters`/`facetCounts`. Static for all 16 pairs (`generateStaticParams`). DLC page (d1/dlcs): release-order cards with no filter panel (per spec).
7. **Detail links:** cards link to `/[game]/[category]/[slug]`. Create a **minimal** detail page now (H1 + Infobox placeholder + SourceCredit) so links work; Prompt 08 fills it in.
8. **Performance:** check the build output: category page first-load JS ≤ 180 kB gzip. Item images in cards use `next/image` (`sizes` set, lazy). If the props payload for the biggest category is over 150 kB, slim down `listFields`.
9. **Tests:** engine + url + path unit tests (100 % branches); component tests (TypeSelector reveals level 2, RangeFilter commit, MultiFilter search, ActiveFilterChips removal); e2e `filters.spec.ts` (exactly as written in 08) plus a parametrized e2e that opens **every one of the 16 category pages**, checks that results are > 0, clicks the first type chip and checks the count changes or stays valid, and runs axe on each.

## Mini-checklist
- [x] Filter engine + path DSL + URL codec, 100 % branches, benchmark < 10 ms
- [x] Category config for all 16 pairs
- [x] Filter configs for all 16 pairs exactly per 06-FILTERS-SPEC
- [x] TypeSelector (2 levels), FilterPanel (+ showWhen), Range/Multi/Toggle, chips, sort, view, results count, mobile sheet
- [x] EntityCard + EntityTable (+ aria-sort), QualityBadge
- [x] URL state: shareable, reload-safe, Back restores the previous state
- [x] Facet counts correct (unit-tested on fixtures)
- [x] All 16 category pages statically generated; DLC page special case
- [x] Minimal detail pages so no link 404s
- [x] Budgets: payload ≤ 150 kB met (largest 93 kB); first-load JS measured 231 kB, the 180 kB target is not reachable on the current shell (198 kB before this page), so the documented alternative is +33 kB over the shell, D-076, with the rest carried to Prompt 13
- [x] filters e2e + 16-page sweep + axe pass
- [x] Visual check `/d1/weapons`, `/d2/armor`, `/d1/enchantments`, `/d2/talismans` in both themes at 1440/390 against Wireframe §3

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(browse): category browser with type-first selection and filters`
