# Prompt 11: Compare & Favorites

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 10.
**Read first:** `[ Plans ]/07-FEATURES-SPEC.md` §3–4; `05-ROUTES-AND-PAGES.md` (`/[game]/compare`, `/favorites`); `[ Design ]/Wireframes/WIREFRAMES.md` §3 (compare tray), §5.

## Goal
Users can compare 2–4 items of one category side by side, and star favorites that persist, sync across tabs and can be backed up.

## Tasks
1. **Stores** (`src/lib/compare/store.ts`, `src/lib/favorites/store.ts`): small external stores on top of `safeStorage` with `useSyncExternalStore` hooks (SSR-safe: the server snapshot is empty, and the UI renders a stable placeholder until hydration so there's no hydration mismatch). Cross-tab sync uses the `storage` event. Compare: per game `{ category, slugs[] }`, max 4; adding from a different category asks through a toast action whether to "Start a new comparison". Favorites: `string[]` of ids, v1 key, with a Zod-validated migration hook.
2. **Turn on the actions** on EntityCard (★, ⇄ checkbox), the detail page header (Favorite, Add to compare) and the palette's `Ctrl+Enter`. All of them get proper labels and `aria-pressed`.
3. **Compare tray** (sticky bottom on category pages when the current category has selections): thumbnails, count, Compare button, Clear.
4. **Compare page** `app/[game]/compare/page.tsx`: static shell; a client component reads `?c=&items=` (nuqs), falling back to the store. It loads the category's full entities from a **per-category static JSON** (generate `public/compare/{game}/{category}.json` during prebuild with only the `compareRows` fields, or pass every compare-enabled category's rows as props if the total is ≤ 200 kB; pick one, measure, and log it). Table per 07 §3: sticky headers with remove ✕, best-value highlight (respecting `lowerIsBetter`), "Differences only", an "Add item" combobox scoped to the category, 2-column horizontal snap on mobile, and an empty state with links when < 2 items. Category select only if no `c` is given.
5. **Favorites page** `app/(site)/favorites/page.tsx`: Tabs D1/D2 → groups by category → EntityCards (the data comes from the same per-category JSON approach, or from a small `public/favorites-index/{game}.json` of `{id, slug, name, image, rarity, category}`; reuse the search index if it already has those fields, which it does, so prefer reusing `public/search/{game}.json`). Empty state. A Backup menu with Export (downloads `dungeons-codex-favorites.json`) and Import (file input, Zod-validated, Merge or Replace).
6. The header favorites count badge reads the store live.
7. **Tests:** store units (max 4, category switch, cross-tab event, storage blocked); component tests (best-value highlight, differences-only); e2e `compare.spec.ts` (from 08), the favorite part of `detail.spec.ts` (toggle + reload persists), favorites page export/import round trip, and axe on `/d1/compare?…` and `/favorites`.

## Mini-checklist
- [x] SSR-safe compare + favorites stores with cross-tab sync and storage-blocked fallback
- [x] ★ / ⇄ actions on cards, detail headers and the palette
- [x] Compare tray
- [x] Compare page: URL state, best-value, differences only, add picker, mobile snap, empty state
- [x] Compare data delivery approach measured + logged
- [x] Favorites page with tabs, groups, empty state, export/import
- [x] Header count live
- [x] No hydration warnings in the console (Playwright console listener asserts none)
- [x] Unit, component and e2e tests + axe pass
- [x] Visual check of compare and favorites in both themes at 1440/390

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(tools): compare and favorites`
