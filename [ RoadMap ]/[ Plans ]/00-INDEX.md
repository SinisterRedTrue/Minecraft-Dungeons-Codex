# Dungeons Codex: Master Plan Index

> **This folder is the single source of truth for the project.** When a prompt, the checklist and this folder disagree, **this folder wins**. If this folder is wrong, fix it here first, add a line to `10-DECISIONS-LOG.md`, and only then change code.

## Read order (for Claude at the start of every session)

| # | File | What it answers |
|---|------|-----------------|
| 1 | `01-PROJECT-OVERVIEW.md` | What we are building, for whom, scope and non-goals, and what "done" means |
| 2 | `02-TECH-STACK-AND-ARCHITECTURE.md` | Stack, exact folder layout, scripts, rendering model |
| 3 | `03-CONTENT-MODEL.md` | Every data schema for all 16 categories (8 per game) |
| 4 | `04-DATA-PIPELINE.md` | How data and images are pulled from minecraft.wiki, validated and stored |
| 5 | `05-ROUTES-AND-PAGES.md` | Every URL and the anatomy of every page |
| 6 | `06-FILTERS-SPEC.md` | The filter definition for every category |
| 7 | `07-FEATURES-SPEC.md` | Search, Power Forge, Compare, Favorites, Build Planner, Theme |
| 8 | `08-QUALITY-STANDARDS.md` | Code conventions, testing, accessibility, performance, SEO, and the verification commands |
| 9 | `09-LEGAL-AND-ATTRIBUTION.md` | License obligations (CC BY-NC-SA 3.0) and trademark rules |
| 10 | `10-DECISIONS-LOG.md` | Every decision made, why, and the rule for making new ones |

Design lives in `../[ Design ]/` (start at `../[ Design ]/README.md`).
Progress lives in `../[ Checklist ]/CHECKLIST.md`.
Stage prompts live in `../[ Prompts ]/`.

## Golden rules (never break these)

1. **Never ask the human a question during a prompt.** Every product question has already been answered in this folder. If something is genuinely ambiguous, apply the *Decision Rules* in `10-DECISIONS-LOG.md`, log the decision, and continue. The only human steps are the ones listed in the Checklist under **Human-only steps**.
2. **Never mark a task done without evidence.** "Done" means the stage's verification commands were run *in this session* and passed. Paste the summary lines into the Checklist log.
3. **Never invent game data.** Every stat, name and number comes from the scraped minecraft.wiki data or from a documented override in `data/overrides/` with a source URL. Numbers we computed (Power Forge interpolation) are always shown with an **Approximate** badge.
4. **One stage at a time, in order.** Do not start prompt N+1 until prompt N is ticked in the Checklist.
5. **Stay inside scope.** New ideas go to `../[ Design ]/Ideas/IDEAS.md` (backlog). Don't build them.
6. **Keep the build green.** Every commit must pass `npm run verify`.
7. **Commit at the end of every stage** with the message given in the prompt, plus the attribution trailer.
8. **Privacy.** Never put the user's name, email or other personal details in code, commits, User-Agent strings or any outbound request.

## Key paths

| Name | Path |
|------|------|
| Workspace root (git repo root) | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]` |
| App root (`PROJECT_ROOT`) | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]\dungeons-codex` |
| RoadMap | `C:\Users\SinisterRed\Desktop\[ Core ]\[ Dungeons Wiki ]\[ RoadMap ]` |

> If Prompt 01's path smoke test forces the app to move (because of the `[ ]` brackets in the path), the **current** `PROJECT_ROOT` is whatever the Checklist's **Paths** block says. The Checklist is updated when the move happens.
