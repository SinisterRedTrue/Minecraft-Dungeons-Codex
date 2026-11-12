# 10: Decisions Log

## Decision Rules (how to decide without asking the human)
Apply these in order when a prompt hits an ambiguity:
1. **The Plans folder says it** → do that.
2. **The Design folder says it** (for visual matters) → do that.
3. **What the wiki data supports**: never fabricate. If the data lacks something, show less, and show it honestly (hide the filter, or mark it Partial/Approximate).
4. **The user's original brief**: one game picker → 8 sections per game → type-first selection → filters; civilization.gg's feel in a Dungeons theme; production quality for a public community site.
5. **Simplest option that fully meets the acceptance criteria** (YAGNI). Leftover ideas go to `[ Design ]/Ideas/IDEAS.md`.
6. **Accessibility and performance win ties.**

Every decision made under these rules gets a row below: date, prompt, decision, why, files affected.

## Decisions made during planning (2026-11-12, confirmed by the user)
| # | Decision | Why |
|---|---|---|
| D-001 | Product name **Dungeons Codex** | User's choice |
| D-002 | Public site for a small community, built to production quality | User: "public and accessible… critical and worked on greatly" |
| D-003 | Next.js + TypeScript + Tailwind, static generation, hosted on **Vercel free tier** | User's choice; best fit for static content with a rich client UI |
| D-004 | Data is **scraped from minecraft.wiki into committed JSON** at sync time; no runtime fetching | User's choice; gives speed, stability and politeness |
| D-005 | Images are **downloaded and self-hosted** (WebP), with credit | User's choice |
| D-006 | D2 sections match the wiki: Weapons, Armor, Enchantments, Artifacts, Talismans, Quests, Mobs, Locations (the brief's duplicated "Quests" was a typo) | User's choice |
| D-007 | **Claude builds everything** by running the prompts in order. The Design folder is also written to work as a Codex brief | User's choice |
| D-008 | Features: Filters, Detail pages, Search, **Power Forge**, Compare, Favorites, Build Planner, Dark/Light theme | User's choice; "Power Forge" is the name for the level/stat simulator the user asked for |
| D-009 | Power Forge uses documented power tables, with log-linear interpolation and curve fallbacks marked **Approximate**; D2 shows tier effects only until scaling data exists | User's choice ("Documented formulas + flags") |
| D-010 | Git: Claude commits locally after each stage; **the user** creates the GitHub repo and connects Vercel | User's choice |
| D-011 | Theme borrows civilization.gg's *layout and interaction language* (3D "b3d" buttons, rounded 20–24 px cards, sticky rounded nav, reveal-on-scroll, wave dividers, Rubik 900 uppercase headings), re-skinned for Dungeons. No server-related content | User's brief |
| D-012 | Default theme is **dark** ("Dungeon Night"); light is "Parchment" | Dungeons' mood; civ's cream palette inspires the light theme |
| D-013 | Data and text are licensed CC BY-NC-SA 3.0; code is MIT; no monetization | Source license |
| D-014 | Arcade content, unused items and other spin-offs are excluded | Scope control |
| D-015 | Repo root = workspace root `[ Dungeons Wiki ]`; app in `dungeons-codex/`; Vercel root directory = `dungeons-codex` | Keeps the RoadMap versioned with the code |

## Decisions made during build
| # | Date | Prompt | Decision | Why | Files |
|---|---|---|---|---|---|
| D-016 | 2026-11-12 | 01 | Environment: Node v24.22.1 (≥ 22, OK), npm 11.19.1, git 2.56.0.windows.2 | Meets the Node 22+ requirement; no Node 20 fallback needed | none |
| D-017 | 2026-11-12 | 01 | Pinned stack (exact): next 16.4.6, react/react-dom 19.3.0, tailwindcss + @tailwindcss/postcss 4.3.5, typescript 5.9.3, eslint 9.39.5, eslint-config-next 16.4.6, typescript-eslint 8.72.2, vitest + @vitest/coverage-v8 5.1.0, @vitejs/plugin-react 6.3.0, jsdom 31.0.0, @testing-library/react 16.3.3, @playwright/test 1.65.0, @axe-core/playwright 4.14.0, prettier 3.10.0, tsx 4.23.15, zod 4.6.7, nuqs 2.10.3, cmdk 1.1.1, flexsearch 0.8.212, sharp 0.35.5, cheerio 1.2.0, wikiparser-node 2.1.0 (full list in `package.json`; `.npmrc` sets `save-exact=true`) | Spec: pin exact versions and record them. Later prompts that need a different major (for example Zod 4 API) read these | `dungeons-codex/package.json`, `.npmrc` |
| D-018 | 2026-11-12 | 01 | The Next 16 scaffold enabled `cacheComponents` + `partialPrefetching` and a `@tailwindcss/turbopack` loader. Removed all three: `next.config.ts` is empty, Tailwind runs through `@tailwindcss/postcss` + `postcss.config.mjs` (the documented setup) | D-003 / `02-TECH-STACK…` want plain static generation with `generateStaticParams`; Cache Components changes rendering rules (dynamic by default) and isn't in scope. Next 16 builds with Turbopack by default; the path test passes with it | `next.config.ts`, `postcss.config.mjs`, `package.json` |
| D-019 | 2026-11-12 | 01 | Replaced scaffold's `@types/node@20` with `@types/node@22`; `engines.node` stays `>=20` | Vitest 5 peer-requires `@types/node` ≥ 22; Node 22 LTS is the target runtime | `package.json` |
| D-020 | 2026-11-12 | 01 | `wikiparser-node` 2.1.0 installed and loads; Prompt 03 decides whether to keep it or write a custom template parser (log there) | As the spec says | none |
| D-021 | 2026-11-12 | 01 | **Path smoke test passed in place** at `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]\dungeons-codex`: Vitest found its test, ESLint/Prettier/tsc ran, Tailwind generated `text-4xl` (H1 computed font-size 36 px in Playwright), `next build` succeeded, Playwright webServer ran. No relocation; `PROJECT_ROOT` unchanged | Acceptance of Prompt 01 task 14 | Checklist **Paths** unchanged |
| D-022 | 2026-11-12 | 01 | Vitest config is `vitest.config.mts` (not `.ts`); `scripts/**` may use `console` (ESLint override) while `src/**` keeps `no-console` (warn/error allowed); `AGENTS.md` (written by Next) is committed and Prettier-ignored | Avoids Vite's CJS-config warning; CLI scripts need stdout; Next re-creates AGENTS.md on `next dev`. Root `.gitattributes` forces `eol=lf` so Prettier's `format:check` also passes on Windows clones (autocrlf) | config files, `.gitattributes` |
