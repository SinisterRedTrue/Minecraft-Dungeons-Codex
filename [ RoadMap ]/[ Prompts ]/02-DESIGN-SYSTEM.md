# Prompt 02: Design System & UI Kit

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 01.
**Read first:** the whole `[ Design ]` folder (`README.md`, `Plan/DESIGN-SYSTEM.md`, `Tokens/tokens.css`, `References/REFERENCE-ANALYSIS.md` and **look at both screenshots**), plus `[ Plans ]/07-FEATURES-SPEC.md` §6–7.

## Goal
Every primitive in Design System §6 is built, themed (dark/light, D1/D2 accent), accessible, unit-tested, and shown on `/dev/ui`.

## Tasks
1. **Tokens:** copy `[ Design ]/Tokens/tokens.css` to `src/styles/tokens.css` **verbatim**. `globals.css` imports it, then Tailwind. Map the tokens into Tailwind v4 `@theme` (colors `bg`, `bg-2`, `surface-1..3`, `line`, `text`, `muted`, `accent`, `gold`, `rarity-*`; radii; fonts) so utilities like `bg-surface-1 text-muted rounded-card` work.
2. **Fonts:** `next/font/google` Rubik (400–900) → `--font-rubik`, Silkscreen (400) → `--font-silkscreen`, applied on `<html>`.
3. **Theme:**
   - An inline `<script>` in `<head>` (via `next/script` `beforeInteractive`, or a raw `dangerouslySetInnerHTML` script in the root layout) that sets `document.documentElement.dataset.theme` from `localStorage['dc:theme']` (`light|dark|system`), falling back to `prefers-color-scheme`. Wrap it in try/catch.
   - `ThemeProvider` (client) + `ThemeToggle` (Light / Dark / System, Radix ToggleGroup or a menu).
   - `src/lib/storage/safeStorage.ts` (get/set/remove with try/catch and JSON helpers), unit-tested, including the case where storage throws.
4. **Primitives** in `src/components/ui/`: Button3D, Card, Panel, Chip, Badge, RarityFrame, StatBar, Slider, RangeSlider, Dialog, Sheet, Tabs, Tooltip, Popover, Select, Checkbox, Switch, Toast (+ `useToast`), Skeleton, EmptyState, SectionHeading. In `src/components/layout/`: WaveDivider, Reveal (IntersectionObserver wrapper that adds the `.in` class once). Follow every measurement in Design System §2/§6 exactly (edge depths, hover −2 px, active +3 px, 120 ms, radii).
5. **Utilities:** `cn.ts` (already exists from 01), plus new `slugify.ts` (handles apostrophes, accents and `&`), `format.ts` (numbers with thousands separators, percents, seconds), each unit-tested.
6. **Brand:** `public/brand/logo.svg` (emerald gem over an open book, ≤ 2 kB, original art), the `Wordmark` component (CSS text "DUNGEONS CODEX" with a 3D text shadow), favicon (`app/icon.svg`), `public/brand/og-default.png` (1200×630, generated with `next/og` at build time or rendered once with sharp from an SVG; commit the PNG).
7. **Stone texture:** an inline SVG noise data URI (< 2 kB) as an optional `.bg-stone` utility.
8. **`/dev/ui` showcase** (`app/dev/ui/page.tsx`, `notFound()` in production): every component in every variant, size and state, plus a theme switch and a D1/D2 accent switch that sets `data-game` on a wrapper.
9. **Contrast check:** `scripts/contrast.ts` computes WCAG ratios for every text/background token pair in both themes (text, muted, accent-text, and rarity on bg and surface-1; button ink on its fill). Fail under 4.5 (body) or 3.0 (large/UI). Run it; if a token fails, adjust **the token in both** `src/styles/tokens.css` **and** `[ Design ]/Tokens/tokens.css`, and log it.
10. **Component tests** (`tests/unit/components/`): Button3D (renders as a button or link, disabled), Chip (aria-pressed), RangeSlider (keyboard changes the value, `onValueCommit`), ThemeToggle (persists, sets `data-theme`), Dialog (focus trap, Esc).
11. **E2E:** `tests/e2e/theme.spec.ts` (from 08) and `tests/e2e/ui-kit.spec.ts` (skipped in production builds; instead check that `/dev/ui` returns 404 in production).

## Mini-checklist
- [x] tokens.css copied verbatim and mapped into Tailwind `@theme`
- [x] Rubik + Silkscreen loaded through next/font
- [x] No-flash theme script + ThemeToggle + safeStorage (tested)
- [x] All 21 UI primitives + WaveDivider + Reveal built to spec
- [x] cn / slugify / format utilities, tested
- [x] Logo, wordmark, favicon, OG default image (all original art)
- [x] `/dev/ui` shows every variant, with theme + accent switches; 404 in production
- [x] Contrast script passes for both themes (results logged)
- [x] Component tests + theme e2e pass
- [x] Visual check of `/dev/ui` in dark/light × D1/D2 × 1440/390 matches Design System §2/§6
- [x] Reduced motion turns off reveal, shimmer and skeleton animation (checked with Playwright `reducedMotion: 'reduce'`)

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```
```bash
npx tsx scripts/contrast.ts
```

## Commit
`feat(ui): design tokens, theming and core UI kit`
