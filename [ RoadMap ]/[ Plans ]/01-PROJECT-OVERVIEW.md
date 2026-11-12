# 01: Project Overview

## Vision
**Dungeons Codex** is a fast, beautiful, easy-to-browse fan wiki for **Minecraft Dungeons** (2020) and **Minecraft Dungeons II** (2026). It has the depth of minecraft.wiki, plus the playful, chunky, rounded feel of civilization.gg re-skinned in a Dungeons style. It adds tools the wiki doesn't have: powerful filters, item comparison, a Power Forge stat simulator and a shareable Build Planner.

## Audience
- Primary: a small community (the owner's friends) who play Dungeons 1 and 2 together.
- Secondary: any public visitor. The site is public, so it must be production quality: accurate, accessible, fast, and properly credited.

## Core user journey
1. **Pick a game** on `/`: two large cards, *Minecraft Dungeons* and *Minecraft Dungeons II*.
2. **Pick a section** on the game hub (`/d1` or `/d2`).
   - **Dungeons 1:** Weapons · Armor · Enchantments · Artifacts · DLCs · Cosmetics · Mobs · Locations
   - **Dungeons 2:** Weapons · Armor · Enchantments · Artifacts · Talismans · Quests · Mobs · Locations
3. **Pick a type first** (for example Weapons → Melee / Ranged → Dual-wield / Heavy / …), then **filter** (damage range, speed, damage reduction, rarity, DLC, location, …), **sort**, and switch between grid and table views.
4. **Open an item** to see its full detail page: infobox, stats, properties, where to find it, related items, and the **Power Forge**.
5. **Use the tools:** Compare (2–4 items), Favorites, Build Planner (shareable link), global Search (Ctrl/Cmd + K), and the dark/light theme toggle.

## In scope (v1.0)
- All 16 category sections with full scraped data and self-hosted images.
- Category-specific type selectors and filters (see `06-FILTERS-SPEC.md`).
- Detail pages for every entity, with cross-links (item ↔ location ↔ DLC ↔ mob ↔ enchantment).
- Power Forge, Compare, Favorites, Build Planner, Search, Theme toggle.
- Credits/About page, license footer, 404 page, sitemap, SEO metadata, Open Graph images.
- Responsive from 360 px to 1920 px; WCAG 2.2 AA.
- Deployed to Vercel (free tier) from a GitHub repo.

## Out of scope (v1.0): do not build
- User accounts, logins, comments, user edits or any database.
- Live data fetching from minecraft.wiki at runtime (data is fetched at **sync time** only).
- Monetization of any kind: no ads, no donations, no store. The license (NC) forbids it.
- Other Minecraft spin-offs (Legends, Story Mode, Earth).
- Translations (English only; leave i18n-friendly string structure).
- Arcade, other media, soundtracks, books.

## Success criteria (release gate)
| Area | Target |
|------|--------|
| Data coverage | ≥ 98 % of entities listed on each wiki category page exist in our data with all **required** fields; the rest are listed in the coverage report and badged *Partial* |
| Correctness | Spot-check of 20 random entities per game matches the wiki (done in Prompt 13) |
| Performance | Lighthouse mobile ≥ 90 Performance, ≥ 95 Accessibility, ≥ 95 Best Practices, ≥ 95 SEO on `/`, `/d1/weapons`, and one detail page |
| Accessibility | Zero serious/critical axe violations on all page templates; fully keyboard operable |
| Quality | `npm run verify` and `npm run e2e` green; TypeScript strict with zero `any` in `src/` |
| UX | A filter change updates results in < 100 ms for the largest category; every filter state is shareable by URL |
| Legal | License footer, per-page source links, trademark disclaimer and Credits page present |

## Naming
- Product name: **Dungeons Codex**
- Game short codes: `d1` = Minecraft Dungeons, `d2` = Minecraft Dungeons II
- Feature names: **Power Forge** (stat simulator), **Compare**, **Favorites**, **Build Planner**, **Codex Search**
