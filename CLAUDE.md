# Dungeons Codex: Workspace Guide for Claude

This workspace builds **Dungeons Codex**, a public fan wiki for Minecraft Dungeons I & II (Next.js + TypeScript + Tailwind, data scraped from minecraft.wiki, hosted on Vercel). **v1.0.0 is built and tagged**; what remains is the owner's deploy (Checklist **Human-only steps**) and later maintenance.

## Where things are
| What | Where |
|---|---|
| The app (`PROJECT_ROOT`) | `dungeons-codex/` (a Next.js app; run every `npm` command here) |
| Product and technical decisions (source of truth) | `[ RoadMap ]/[ Plans ]/00-INDEX.md`, decisions in `10-DECISIONS-LOG.md` |
| Visual spec | `[ RoadMap ]/[ Design ]/README.md` |
| Backlog of ideas (not in v1.0) | `[ RoadMap ]/[ Design ]/Ideas/IDEAS.md` |
| Build history, release audit, deploy steps | `[ RoadMap ]/[ Checklist ]/CHECKLIST.md` |
| Stage prompts + protocol (historical) | `[ RoadMap ]/[ Prompts ]/00-PROMPT-PROTOCOL.md` |
| Maintainer guide (refresh data, add a category or filter, troubleshooting) | `dungeons-codex/docs/MAINTAINING.md` |
| README (setup, scripts, structure, licenses) | `dungeons-codex/README.md` |

Inside the app: `src/app` (routes), `src/components`, `src/config` (declarative per-category display, filters, detail sections), `src/lib` (data loaders, Zod schemas, filter engine, forge math, planner codec), `scripts/` (wiki client, parsers, pipeline), `data/generated` (committed JSON the site reads), `public/images`, `tests/{unit,fixtures,e2e}`.

## Always do this first
- **Read the Plans before changing behavior.** When a file under `[ RoadMap ]/` and the code disagree, the Plans win; if the Plans are wrong, fix them first, add a row to `10-DECISIONS-LOG.md`, then change code.
- When the user says **"Check the Checklist and continue with the next prompt"** and every stage is ✅, there is no next prompt: report that v1.0 is done and what the Human-only steps still are.
- When the user says **"Refresh the Dungeons Codex data from the wiki following MAINTAINING.md, verify, and commit."**, follow `dungeons-codex/docs/MAINTAINING.md` exactly (sync, validate, coverage, index, verify, commit; the user pushes).

## Verify commands (in `dungeons-codex/`)
- `npm run verify`: typecheck, lint, prettier, no-hex check, unit tests, data validation and the production build. **Must be green before every commit.**
- `npm run e2e`: Playwright against the production build (desktop and 390 px, axe, keyboard, SEO, legal, headers). Run it after any UI, routing, header or data change.
- `E2E_DEV_SERVER=1 npx playwright test ui-kit`: the dev-only `/dev/ui` specs.
- `npm run data:validate`, `npm run data:coverage`, `npm run knip`, `npx tsx scripts/dev/bundle-size.ts --check` for data, dead code and bundle budgets.

## Hard rules
- Don't ask the user product questions mid-task; use the Decision Rules in `[ Plans ]/10-DECISIONS-LOG.md` and log the decision.
- Never invent game data; computed numbers carry an Approximate badge. Wrong wiki data is fixed with a sourced override in `data/overrides/`, never by editing `data/generated/`.
- The deployed site and `next build` never contact minecraft.wiki; only `npm run data:sync` does, politely (1 request/s, no personal details in the User-Agent).
- No monetization, no analytics or trackers, no official Mojang logos, keep CC BY-NC-SA attribution and the exact footer disclaimer (see `[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`).
- Colors come from design tokens only (`npm run check:hex` enforces it); the CSP allows same-origin sources only, so anything loaded from another origin needs a decision and a CSP change.
- Keep personal details out of code, commits and outbound requests.
- Quote paths. This folder contains `[`, `]` and spaces.
- Commit messages end with the attribution trailer the session's system gives; commits are local, the user pushes.
