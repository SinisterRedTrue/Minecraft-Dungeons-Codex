# Prompt 13: Quality Pass (a11y, performance, SEO, responsive, data audit)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 12.
**Read first:** `[ Plans ]/01-PROJECT-OVERVIEW.md` (success criteria), `08-QUALITY-STANDARDS.md` (all of it), `09-LEGAL-AND-ATTRIBUTION.md`; the whole `[ Design ]/Plan/DESIGN-SYSTEM.md`.

## Goal
Prove every v1.0 release criterion with evidence, and fix everything that falls short. Nothing new is built in this stage except the fixes.

## Tasks
1. **Full test suite:** make sure all 11 e2e specs from 08 exist and are complete (fill in any gaps from earlier stages). Run `npm run e2e`, and fix flakiness at its root (no blind retries; `retries: 0` locally).
2. **Accessibility:** `a11y.spec.ts` sweeps every template route from 08 in **both themes** and at **both viewports**: 0 serious/critical. A manual keyboard pass on `/`, a category page, a detail page with the Forge, compare, the planner (with the picker), and the search palette: logical focus order, visible focus, no traps, Esc closes overlays. Check the screen-reader semantics with `read_page` in the browser pane (landmarks, headings, labels). Record the findings and fixes.
3. **Performance:** run Lighthouse (mobile) through `npx lighthouse` against `next start` for `/`, `/d1/weapons` and `/d1/weapons/claymore` (or another real slug). Targets: Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 95. Fix the regressions (image sizes, font loading, JS splitting, layout shift). Check the first-load JS budgets in the `next build` output. Save the Lighthouse JSON summaries to `dungeons-codex/docs/lighthouse/` (the scores only, as a small markdown table).
4. **Responsive:** screenshot every template at 360, 390, 768, 1024, 1440 and 1920 px (dark theme) plus 390 and 1440 (light). There must be no horizontal scroll, no overlapping or clipped text, and touch targets ≥ 44 px. Fix any defects.
5. **Design fidelity:** compare the screenshots with `DESIGN-SYSTEM.md` §2 measurements (button edges and press physics, card radii and edges, nav shape, reveal motion, typography) and the wireframes. Fix any deviations. Add a check that fails on raw hex colors in `src/` outside `src/styles/` (a regex scan in `scripts/check-no-hex.ts`, added to `verify`).
6. **SEO:** check that each page has a unique title and description, one H1, a canonical URL, OG images rendering (open 3 OG image URLs), a sitemap URL count = static + entities, valid robots, and valid JSON-LD (parse and spot-check its structure).
7. **Data audit:** 20 random entities per game (seeded; different from the earlier spot checks), compared field by field against the live wiki. Target 100 % match on required fields. Fix the parsers or overrides, re-sync offline, and log the results.
8. **Legal check:** footer text exact, SourceCredit on every detail page (e2e asserts it on the 16-category sweep), `/about` complete, both license files present, no monetization anywhere, no official logos.
9. **Error and edge states:** a malformed `?b=`, `?items=` or filter params; storage blocked (Playwright context with `localStorage` throwing via an init script); slow network on the search index (route throttle); an unknown slug gives a 404. Everything degrades gracefully.
10. **Code health:** no `any`, no unexplained `eslint-disable`, no `console.log`, no TODOs in `src/` (`grep`), all files ≤ 250 lines (split as needed), dead code removed (install `knip` as a dev dependency, run `npx knip`, then fix every finding or justify it in the log).
11. Run `superpowers:requesting-code-review` (or the `code-review` skill) on the whole codebase and address every valid finding.

## Mini-checklist
- [ ] 11 e2e specs complete and green, with no retries
- [ ] axe: 0 serious/critical across all templates × 2 themes × 2 viewports
- [ ] Manual keyboard pass recorded
- [ ] Lighthouse targets met on 3 pages (scores saved)
- [ ] JS budgets met
- [ ] Responsive matrix screenshots reviewed, defects fixed
- [ ] Design fidelity verified; no-hex check added to verify
- [ ] SEO checks pass (titles, H1, canonical, OG, sitemap count, JSON-LD)
- [ ] 20 + 20 data audit at 100 % on required fields (logged)
- [ ] Legal checks pass
- [ ] Edge states degrade gracefully
- [ ] Code health checks pass
- [ ] Code review findings addressed

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```
Plus the Lighthouse table and the data audit results in the Checklist log.

## Commit
`chore(quality): accessibility, performance, SEO and data audit pass`
