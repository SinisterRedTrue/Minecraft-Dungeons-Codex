# Prompt 14: Deploy Readiness & Handoff

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 13.
**Read first:** `[ Plans ]/02-TECH-STACK-AND-ARCHITECTURE.md` (Environment, Hosting), `04-DATA-PIPELINE.md` (Refresh procedure), `09-LEGAL-AND-ATTRIBUTION.md`; the Checklist's **Human-only steps**.

## Goal
The repo is ready for the user to push to GitHub and deploy on Vercel in about 5 minutes. Docs let anyone (or a future Claude session) maintain and refresh the site. A final release audit confirms v1.0.

## Tasks
1. **Vercel readiness:** `dungeons-codex/vercel.json` only if it's needed (the defaults should work; prefer none). Confirm `next build` works from a clean clone: `git clone` the local repo into a temp dir (scratchpad), `cd dungeons-codex && npm ci && npm run build`. The build must be offline-safe, with no wiki requests (check that by running with the network-dependent scripts excluded; `prebuild` runs only `data:index`, which reads local files).
2. **Security headers** in `next.config.ts` `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy` (camera, mic and geolocation disabled), and a CSP that allows only self plus inline styles needed by next/font (test it, and make sure the theme script still runs, using a nonce or hash). Add an e2e that asserts the headers.
3. **README** (`dungeons-codex/README.md`): overview, screenshot (take one of `/` and save it to `docs/screenshot.png`), features, tech stack, local setup, the scripts table, data refresh procedure (exact commands from 04), project structure, how to add an override, testing, deployment steps, licenses (MIT code / CC BY-NC-SA data), disclaimer, credits.
4. **Maintainer docs** `dungeons-codex/docs/MAINTAINING.md`: updating data after a game patch, adding a new category, adding a filter (config only), adding a D2 DLC section later (pointer to IDEAS), troubleshooting the scraper (cache, 429s, title changes).
5. **Root `CLAUDE.md`:** update it to the post-v1.0 state (where things are, the verify commands, "read the RoadMap Plans before changing behavior").
6. **Final release audit:** walk through every success criterion in `[ Plans ]/01-PROJECT-OVERVIEW.md` and write a pass/fail table with evidence into the Checklist log. Any fail means fix it, then redo the audit.
7. **Human-handoff block:** make sure the Checklist **Human-only steps** section has the exact click-by-click instructions (they're pre-written; verify them against the current GitHub and Vercel UI wording through the docs, and update them if they've changed). Then print those steps in your final message to the user.
8. Tag the release: `git tag v1.0.0` (local only; the user pushes the tags).

## Mini-checklist
- [ ] Clean-clone build passes offline-safe
- [ ] Security headers + CSP working (e2e asserts them)
- [ ] README complete with screenshot
- [ ] MAINTAINING.md
- [ ] Root CLAUDE.md updated
- [ ] Release audit table: all pass
- [ ] Human-only steps verified and printed to the user
- [ ] `v1.0.0` tag created

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```
Clean-clone build log summary in the Checklist log.

## Commit
`docs: deployment readiness, README and maintainer guide (v1.0.0)`
