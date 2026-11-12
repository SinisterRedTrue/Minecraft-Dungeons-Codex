# Prompt 09: Codex Search (Ctrl/⌘ + K)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 08.
**Read first:** `[ Plans ]/07-FEATURES-SPEC.md` §1; `[ Design ]/Wireframes/WIREFRAMES.md` §7.

## Goal
Instant fuzzy search across both games from anywhere, keyboard-first, lazy-loaded.

## Tasks
1. **Index build** `scripts/index.ts` (`npm run data:index`): for each game, write `data/generated/{game}/search-index.json` **and** copy it to `public/search/{game}.json`. Entries: `{ id, g, c, s, n, a, t, r, i }` (short keys to keep it small: id, game, category, slug, name, aliases, tags, rarity, image src). Aliases are the name without apostrophes, the internal Level ID (D1), and common abbreviations from a tiny `data/vocab/aliases.json` you create (e.g. "fw arrow" → Fireworks Arrow). Size target: ≤ 60 kB gzip per game.
2. Add `data:index` to the `build` script as a prebuild step (`"prebuild": "npm run data:index"`) so the index can never be stale. It must run offline (it reads only generated JSON).
3. **Search lib** `src/lib/search/`: `loadIndex(game)` (fetch once, cached in module memory), `buildFlex(entries)` (FlexSearch Document: name boost 3, aliases 2, tags 1; `tokenize: 'forward'`), and `query(text, scope, limit)` → grouped results. Unit-test ranking: "clay" → Claymore first; "hunters" → Hunter's …; a typo "claymor" still finds Claymore (add a fallback edit-distance-1 pass over names if FlexSearch alone misses it).
4. **Palette** `src/components/features/search/SearchPalette.tsx` (cmdk inside Radix Dialog): opens on `Ctrl/⌘+K`, `/` (when not typing in an input), and the header button and hero pill. Scope chips (This game / Both). Results grouped by category with icon, name, category label and a game badge. Empty query shows Recent (localStorage `dc:recent`, max 8) and Jump to (8 categories). `Enter` opens; `Ctrl+Enter` adds to compare (wired to a no-op until Prompt 11; add a TODO only in the Checklist, not in code). Footer hint bar. Loading skeleton while the index fetches. Error state if the fetch fails.
5. Replace the placeholder search dialog from Prompt 06 everywhere.
6. **Tests:** lib unit tests; component test (keyboard navigation, scope switch); e2e `search.spec.ts` (from 08), plus `/` opening it, plus axe with the palette open.

## Mini-checklist
- [ ] Index script + prebuild hook + aliases vocab; ≤ 60 kB gzip per game
- [ ] Search lib with ranking + typo fallback, tested
- [ ] Palette: shortcuts, scopes, grouping, recent, jump-to, states, a11y
- [ ] Header button + hero pill wired
- [ ] search e2e + axe pass
- [ ] Visual check of the palette in both themes, desktop + mobile (full-screen sheet style on mobile)

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(search): Codex Search command palette`
