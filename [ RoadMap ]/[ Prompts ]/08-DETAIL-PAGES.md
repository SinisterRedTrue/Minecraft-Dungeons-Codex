# Prompt 08: Detail Pages (all categories)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 07.
**Read first:** `[ Plans ]/05-ROUTES-AND-PAGES.md` (Detail page, Metadata, OG), `03-CONTENT-MODEL.md`, `09-LEGAL-AND-ATTRIBUTION.md`; `[ Design ]/Wireframes/WIREFRAMES.md` §4; `DESIGN-SYSTEM.md` §3, §7.

## Goal
A complete, beautiful, cross-linked detail page for every entity in both games, with SEO metadata and generated OG images.

## Tasks
1. **Template** `app/[game]/[category]/[slug]/page.tsx`: `generateStaticParams` over every entity; `dynamicParams=false`. A shared `DetailLayout` with the header (RarityFrame 128, name, badges, action slots that Prompt 11 turns on: Favorite / Compare / Planner), a main column, an aside (Infobox), Related, SourceCredit and Prev/Next.
2. **Section components** (`src/components/entity/sections/`), chosen through `detailSections` in the category config:
   - `StatsSection` (StatBars scaled to the category max), `PropertiesSection`, `EffectsSection` (value chips), `BuiltInEnchantmentsSection` (linked cards with the level), `VariantsSection` (base ↔ uniques), `WhereToFindSection` (location chips, linked when resolved, plain text otherwise)
   - Enchantments: `EnchantmentTiersTable` (I/II/III text + values, point cost per tier, gilded effect, stackable/mob badges, "Built into" items)
   - Artifacts: cooldown, souls, type
   - D1 DLCs: summary, release date, missions, and **contents grids** (weapons/armor/artifacts/mobs/enchantments whose `dlc` = this DLC)
   - Cosmetics: type, obtained from, season, how to obtain
   - Mobs: type, health, attacks, locations, drops (linked)
   - Locations: type, region, secret-of/secrets, mobs grid, **items found here** grid (from the computed `itemIds`)
   - D2 Talismans: `TalismanTiers` (bronze/silver/gold frame chips T1–T3)
   - D2 Quests: rewards timeline (First vs Subsequent), locations, core order with previous/next quest links
   - D2 Armor: the **Set view**, showing all 4 pieces of the set with links
   - A placeholder `<ForgeSlot />` where Prompt 10 mounts the Power Forge (renders nothing for now)
3. **Infobox** (`Panel`): the key facts as a `<dl>` per category, plus SourceCredit ("Data and image from Minecraft Wiki: {title} (revision {id}) · CC BY-NC-SA 3.0", links to the page URL and the license).
4. **Related grid:** `getRelated` (variants first, then same group). 6 on desktop, 4 on mobile.
5. **Prev/Next:** alphabetical within the category (keyboard shortcuts `[` and `]`, announced in the help tooltip).
6. **Partial data:** sections hide cleanly when their data is missing. `QualityBadge` "Partial data" with a tooltip that links to the wiki page.
7. **Metadata:** title pattern, description, canonical, BreadcrumbList JSON-LD. **OG image** `opengraph-image.tsx`: 1200×630, night background, rarity frame with the item icon (read from `public/images` through `fs` at build time), name, category · game, Dungeons Codex wordmark.
8. **Sitemap:** includes every detail URL (it should already, through the loaders; verify the count = number of entities + static pages).
9. **Tests:** unit tests for each section component (renders with full data, renders nothing or a fallback with missing data); e2e `detail.spec.ts` (from 08; the favorite part is completed in Prompt 11, so for now assert the infobox, source credit, related and prev/next) plus a sweep that opens **one random entity per category for all 16 pairs** (seeded) and runs axe.

## Mini-checklist
- [x] Detail route statically generated for every entity
- [x] DetailLayout (header, main, aside, related, credit, prev/next)
- [x] All section components listed above
- [x] Infobox per category + SourceCredit with revision
- [x] DLC contents grids and location "items found here" grids (cross-links work both ways)
- [x] Partial-data handling + QualityBadge
- [x] Metadata + JSON-LD + OG images
- [x] Sitemap count verified
- [x] Section unit tests + detail e2e + 16-category sweep with axe
- [x] Visual check of one detail page per distinct template (≈ 12) in both themes at 1440/390 against Wireframe §4

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(detail): detail pages with cross-links, infobox, SEO and OG images`
