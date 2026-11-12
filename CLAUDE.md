# Dungeons Codex: Workspace Guide for Claude

This workspace builds **Dungeons Codex**, a public fan wiki for Minecraft Dungeons I & II (Next.js + TypeScript + Tailwind, data scraped from minecraft.wiki, hosted on Vercel).

## Always start here
- **Progress and what to do next:** `[ RoadMap ]/[ Checklist ]/CHECKLIST.md`
- **Source of truth for every product and technical decision:** `[ RoadMap ]/[ Plans ]/00-INDEX.md`
- **Visual spec:** `[ RoadMap ]/[ Design ]/README.md`
- **Stage prompts + protocol:** `[ RoadMap ]/[ Prompts ]/00-PROMPT-PROTOCOL.md`

When the user says **"Check the Checklist and continue with the next prompt"**, follow the instructions at the top of `CHECKLIST.md` exactly: run one prompt to completion, verify, update the Checklist, commit, report, stop.

## Hard rules
- Don't ask the user product questions mid-prompt; use the Decision Rules in `[ Plans ]/10-DECISIONS-LOG.md` and log the decision.
- Never invent game data; computed numbers carry an Approximate badge.
- `npm run verify` (in `PROJECT_ROOT`, see the Checklist **Paths**) must be green before every commit.
- No monetization, no official Mojang logos, keep CC BY-NC-SA attribution (see `[ Plans ]/09-LEGAL-AND-ATTRIBUTION.md`).
- Keep personal details out of code, commits and outbound requests.
- Quote paths. This folder contains `[`, `]` and spaces.
