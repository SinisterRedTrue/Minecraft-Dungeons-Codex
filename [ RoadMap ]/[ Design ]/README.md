# Design: Dungeons Codex

This folder holds the complete visual spec. It works on its own: hand the whole folder to Claude or Codex and it has everything needed to build the UI.

| Path | Contents |
|---|---|
| `Plan/DESIGN-SYSTEM.md` | **Start here.** Design idea, what we borrow from civilization.gg, Dungeons flavor, typography, color rules, every component spec, motion, responsive rules, accessibility |
| `Tokens/tokens.css` | The exact CSS variables (dark default + light), per-game accents, rarity colors, shapes, depth, motion. Copied verbatim into the app |
| `Wireframes/WIREFRAMES.md` | ASCII wireframes for every page template (Picker, Hub, Category Browser, Detail, Compare, Planner, Search) |
| `References/` | Screenshots of civilization.gg and the minecraft.wiki Dungeons hub, plus `REFERENCE-ANALYSIS.md` with the measured CSS values and the wiki's information architecture |
| `Ideas/IDEAS.md` | Backlog of ideas that are out of scope for v1.0 |

## Non-negotiables
1. Layout and feel from civilization.gg; theme from Minecraft Dungeons. **No** server content, IPs, Discord/store CTAs, or civ/Mojang logos.
2. Tokens only: no raw hex colors in components.
3. Both themes (dark default, light) pass WCAG AA.
4. Item icons always render pixel-crisp (`image-rendering: pixelated`) inside a `RarityFrame`.
5. Every animation respects `prefers-reduced-motion`.

## Data the UI can count on
See `../[ Plans ]/03-CONTENT-MODEL.md`. When a field is optional, the component must render well without it.
