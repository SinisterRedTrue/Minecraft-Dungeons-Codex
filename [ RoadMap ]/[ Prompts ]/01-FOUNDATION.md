# Prompt 01: Foundation (repo, scaffold, tooling, path smoke test)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: nothing.
**Read first:** `[ Plans ]/00-INDEX.md`, `02-TECH-STACK-AND-ARCHITECTURE.md`, `08-QUALITY-STANDARDS.md`, `09-LEGAL-AND-ATTRIBUTION.md`.

## Goal
An empty but fully tooled Next.js app at `PROJECT_ROOT`, in a git repo at the workspace root, where `npm run verify` and `npm run e2e` are green and the bracketed path is proven safe.

## Tasks
1. **Environment check:** `node -v` (≥ 22, or log the Node 20 fallback), `npm -v`, `git --version`. Record the versions in the Decisions log.
2. **Git:** `git init -b main` at the workspace root (`C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]`). Create the root `.gitignore`: `node_modules/`, `.next/`, `out/`, `coverage/`, `playwright-report/`, `test-results/`, `dungeons-codex/data/raw-cache/`, `.env*`, `.DS_Store`, `Thumbs.db`, `*.log`, `.vercel`.
3. **Scaffold** in `dungeons-codex/`: `npx create-next-app@latest dungeons-codex --ts --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm --no-turbopack` (if a flag isn't supported by the current version, use the equivalent answer non-interactively and log it). Remove the boilerplate page content.
4. **Pin versions:** strip `^`/`~` from `package.json` and reinstall. Add `"engines": { "node": ">=20" }`.
5. **TypeScript:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `forceConsistentCasingInFileNames`.
6. **Install dev tooling:** `prettier`, `prettier-plugin-tailwindcss`, `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/coverage-v8`, `@playwright/test`, `@axe-core/playwright`, `tsx`, `typescript-eslint`. Then `npx playwright install chromium`.
7. **Install runtime deps** (used later; installing now gives one stable lockfile): `zod`, `nuqs`, `clsx`, `tailwind-merge`, `lucide-react`, `cmdk`, `flexsearch`, `fflate`, `server-only`, and the Radix packages `@radix-ui/react-dialog react-slider react-tabs react-tooltip react-toggle-group react-popover react-checkbox react-select react-switch react-toast react-slot`. Script deps: `cheerio`, `sharp`, `wikiparser-node` (Prompt 03 may drop it in favor of a custom parser; log that).
8. **Configs:** `eslint.config.mjs` (next/core-web-vitals + typescript-eslint strict, `no-console` warn/error only, `@typescript-eslint/no-explicit-any: error`); `.prettierrc` (+ tailwind plugin); `.prettierignore` (`data/generated`, `public/images`, `.next`); `vitest.config.ts` (jsdom, setup file with jest-dom, `include: ['tests/unit/**/*.test.{ts,tsx}']`, coverage v8, the `@` alias); `playwright.config.ts` (`testDir: tests/e2e`, chromium + a mobile project at 390×844, `webServer: { command: 'npm run build && npm run start -- -p 3100', port: 3100, reuseExistingServer: !process.env.CI, timeout: 240_000 }`, `baseURL http://localhost:3100`).
9. **Scripts:** add every script from `02-TECH-STACK…` "npm scripts". `data:*` point at stub files in `scripts/` that print "not implemented yet" and exit 0, except that `data:validate` exits 0 when `data/generated` is empty.
10. **Folder skeleton:** create every directory from the repository layout with `.gitkeep` files where they'd otherwise be empty.
11. **Licenses:** `dungeons-codex/LICENSE` (MIT, copyright "Dungeons Codex contributors"), `dungeons-codex/data/LICENSE.md` (CC BY-NC-SA 3.0 notice + attribution to Minecraft Wiki contributors).
12. **Minimal page:** `src/app/page.tsx` renders `<h1>Dungeons Codex</h1>` with a Tailwind class like `text-4xl`, so the path smoke test can check that Tailwind compiled.
13. **Tests:** create `src/lib/utils/cn.ts` (`clsx` + `tailwind-merge`) now. Then `tests/unit/smoke.test.ts` imports `cn` through the `@/` alias and asserts `cn('p-2','p-4') === 'p-4'` (this proves the alias and the deps work); `tests/e2e/smoke.spec.ts` (visits `/`, expects the H1, and expects the H1's computed `font-size` to equal 36 px, which proves Tailwind ran).
14. **Path smoke test:** run `npm run verify` and `npm run e2e`. If any failure is caused by the `[ ]`/space characters in the path (glob misses, Tailwind not generating classes, Vitest finding 0 tests, a path escaping error), do the **relocation**: move the app to `C:\dev\dungeons-codex`, `git init` there, update the Checklist **Paths** block and `[ Plans ]/00-INDEX.md` Key paths, and log D-0xx. Then re-run until green. If there's no path problem, log "Path smoke test passed in place".
15. **Workspace `CLAUDE.md`:** make sure the root `CLAUDE.md` exists (it was created during planning) and that its paths are still right.
16. **README stub** in `dungeons-codex/README.md`: name, one-line description, the `npm run dev`/`verify` commands, and the license split.

## Mini-checklist
- [x] Node/npm/git versions logged
- [x] git repo on `main` with root `.gitignore`
- [x] Next.js app scaffolded at `PROJECT_ROOT`; exact versions pinned; versions logged
- [x] TS strict flags set
- [x] All dev + runtime deps installed; Playwright Chromium installed
- [x] ESLint, Prettier, Vitest, Playwright configs created
- [x] All npm scripts from the spec exist (data scripts stubbed)
- [x] Folder skeleton matches `02-TECH-STACK…` layout
- [x] MIT + data CC BY-NC-SA license files
- [x] Unit + e2e smoke tests pass
- [x] Path smoke test result logged (in place, or relocated with docs updated)
- [x] README stub

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```
Both green. `git status` is clean after the commit.

## Commit
`chore: scaffold Dungeons Codex (Next.js, TS, Tailwind, tooling)`
