# Prompts: Run Order

Run them strictly in order, one per session turn, using the trigger phrase from the Checklist. Every prompt follows `00-PROMPT-PROTOCOL.md`.

| # | File | Builds | Typical effort |
|---|---|---|---|
| 00 | `00-PROMPT-PROTOCOL.md` | The rules every prompt follows (read, work, verify loop, finish, resume) | (reference) |
| 01 | `01-FOUNDATION.md` | Repo, Next.js scaffold, tooling, path smoke test | S |
| 02 | `02-DESIGN-SYSTEM.md` | Tokens, theming, 21 UI primitives, `/dev/ui` | L |
| 03 | `03-DATA-CORE.md` | Schemas, wiki client, parsing toolkit, loaders, validator | L |
| 04 | `04-DATA-DUNGEONS-1.md` | All D1 data + images (long background sync) | XL |
| 05 | `05-DATA-DUNGEONS-2.md` | All D2 data + images | L |
| 06 | `06-APP-SHELL-AND-NAVIGATION.md` | Layouts, header/footer, Game Picker, Hubs, About, SEO basics | L |
| 07 | `07-CATEGORY-BROWSER-AND-FILTERS.md` | Type-first selection + filters for all 16 categories | XL |
| 08 | `08-DETAIL-PAGES.md` | Detail pages, cross-links, OG images | L |
| 09 | `09-SEARCH.md` | Ctrl/⌘K Codex Search | M |
| 10 | `10-POWER-FORGE.md` | Power Forge stat simulator + tier viewers | L |
| 11 | `11-COMPARE-AND-FAVORITES.md` | Compare + Favorites | M |
| 12 | `12-BUILD-PLANNER.md` | Shareable Build Planner | L |
| 13 | `13-QUALITY-PASS.md` | a11y, performance, SEO, responsive, data audit, code review | L |
| 14 | `14-DEPLOY-AND-HANDOFF.md` | Deploy readiness, docs, release audit, v1.0.0 tag | M |

If a prompt is too big for one session's context, the protocol's resume rule (§E) lets the next session continue from the first unconfirmed checklist item.
