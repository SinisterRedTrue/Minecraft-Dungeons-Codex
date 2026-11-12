# 05: Routes & Pages

All routes are statically generated. `[game]` ∈ `d1 | d2`. `[category]` must be one of that game's 8 categories; anything else returns `notFound()`. `dynamicParams = false` on every dynamic segment.

## Route map
| Route | File | Purpose |
|---|---|---|
| `/` | `app/(site)/page.tsx` | **Game Picker**: hero plus two large game cards |
| `/d1`, `/d2` | `app/[game]/page.tsx` | **Game Hub**: game hero, 8-section grid with counts, featured items, DLC strip (d1) |
| `/[game]/[category]` | `app/[game]/[category]/page.tsx` | **Category Browser**: type selector, filters, sort, grid/table |
| `/[game]/[category]/[slug]` | `app/[game]/[category]/[slug]/page.tsx` | **Detail page** |
| `/[game]/compare` | `app/[game]/compare/page.tsx` | **Compare** (`?c=weapons&items=slug1,slug2,…`) |
| `/[game]/planner` | `app/[game]/planner/page.tsx` | **Build Planner** (`?b=<encoded>`) |
| `/favorites` | `app/(site)/favorites/page.tsx` | Favorites, grouped by game → category |
| `/about` | `app/(site)/about/page.tsx` | About, Credits, License, Disclaimer, data freshness (last sync date per game) |
| `not-found` | `app/not-found.tsx` | Friendly 404 with search and links |
| `/sitemap.xml` | `app/sitemap.ts` | Every static URL |
| `/robots.txt` | `app/robots.ts` | Allow all; points to the sitemap |
| OG images | `app/[game]/[category]/[slug]/opengraph-image.tsx` | Generated card with the item icon, name and rarity color |

`/dev/ui` (the component showcase, Prompt 02) is only available when `NODE_ENV !== 'production'`; in production it returns `notFound()`.

## Layouts
- `app/layout.tsx` (root): `<html>`/`<body>`, fonts, the theme script, providers. **No header or footer.** `<html data-theme>` is set before paint by an inline script that reads `localStorage['dc:theme']` (falling back to `prefers-color-scheme`), so there's no flash of the wrong theme.
- `app/(site)/layout.tsx` (`/`, `/about`, `/favorites`) and `app/[game]/layout.tsx` (`/d1/**`, `/d2/**`) each render `<div data-game="…"><SiteShell/></div>`. The wrapper switches the accent tokens in the server HTML; neutral pages use `d1`. Static routes (`/about`, `/favorites`) take precedence over `[game]`, and `[game]` only allows `d1|d2`.
- **SiteHeader** (sticky, rounded bottom corners, blurred translucent background, like civilization.gg): logo, GameSwitcher (D1/D2 segmented pill), category links for the current game (collapsing into a "Sections" menu below `lg`), a Search button (`⌘K` hint), Favorites (with count), ThemeToggle.
- **SiteFooter**: logo, game links, About/Credits, the license line, the trademark disclaimer, and the data-sync date.
- Skip-to-content link; `<main id="main">`.

## Page anatomy

### `/` Game Picker
1. **Hero** (night background with a torchlight radial glow and floating item icons drifting with parallax; the icons respect reduced-motion): wordmark "DUNGEONS CODEX" (display font, 3D text shadow), tagline, global search field.
2. **Choose your adventure**: two `GameCard`s side by side (stacked on mobile). Each has key art made from item icons, a title, release year, entity counts ("155 weapons · 71 armor · …"), and a primary `Button3D` ("Enter Dungeons" / "Enter Dungeons II"). Hover lifts the card −4 px and grows its glow.
3. **What's inside**: a feature card grid (Filters, Power Forge, Compare, Build Planner, Favorites, Search), mirroring civilization.gg's "What is Civilization?" cards.
4. **Wave divider** → footer.

### `/[game]` Game Hub
1. Game hero band (accent color, title, short blurb, "last synced" chip).
2. **Section grid**: 8 large tiles (icon, label, count, one-line description) in a 4×2 grid (2 columns on mobile). This is the core navigation and mirrors the wiki hub tiles.
3. **Featured**: a horizontal scroller of 8 random unique items, picked deterministically from the build date.
4. D1 only: **DLC strip**, with DLC cards in release order.
5. **Tools** row: Compare, Planner, Favorites shortcuts.

### `/[game]/[category]` Category Browser
1. Breadcrumbs → H1 (category name) + count + one-line intro.
2. **TypeSelector** (step 1, required by the brief): large segmented chips for the category's primary type dimension (see `06-FILTERS-SPEC.md`, "Type selector"). The chips show counts, and "All" is the default.
3. **Layout:** desktop has a left `FilterPanel` (sticky, 280 px) and the results on the right. Mobile has a "Filters (n)" button that opens a bottom `Sheet`.
4. **Results toolbar:** result count, `ActiveFilterChips` (each removable) plus "Clear all", `SortMenu`, `ViewToggle` (grid/table), and a "Compare (n)" tray toggle.
5. **Results:** `EntityCard` grid (auto-fill, min 180 px) or `EntityTable` (sortable columns from config). Results are virtualized only if a category goes past 300 items (not expected).
6. **Empty state:** "No items match", plus a button that clears the last filter.
7. **Compare tray** (sticky bottom when items are selected): thumbnails and a "Compare" button.

### `/[game]/[category]/[slug]` Detail page
1. Breadcrumbs.
2. **Header:** large framed icon (RarityFrame), name, rarity badge, type chips, DLC badge, Unique/Seasonal/Unobtainable badges, QualityBadge if `partial`, and action buttons: ★ Favorite, ⇄ Add to compare, ⚒ Open in Planner.
3. **Two-column body** (stacked on mobile):
   - Left (main): description; **Stats** (StatBars); Properties/Effects list; **Power Forge** (weapons/armor; enchantments get a tier viewer); category-specific sections (enchantment tiers table, talisman tiers, quest rewards, mob attacks/drops, location mobs/items, DLC contents).
   - Right (aside): **Infobox** card (all key facts as a definition list), Where to find (location links), Built-in enchantments, Variants/Base item.
4. **Related** grid (same `weaponType`/group, variants, same DLC).
5. **SourceCredit**: "Data and image from Minecraft Wiki: {page title} (revision #). CC BY-NC-SA 3.0", linked.
6. Prev/next navigation within the category (alphabetical).

### `/[game]/compare`
Up to 4 columns of the same category. Rows are stats, with the best value highlighted; properties; effects; enchantments. There's an "Add item" picker (cmdk combobox scoped to the category) and a "Differences only" toggle. Mixed categories aren't allowed (the picker is scoped).

### `/[game]/planner`
See `07-FEATURES-SPEC.md` §5.

### `/favorites`
Tabs D1 / D2 → grouped by category → EntityCard grid. Empty state with links. Export/import as JSON (a small "Backup" menu).

## Metadata
- `generateMetadata` on every page: title pattern `"{Name} · {Category} · Minecraft Dungeons | Dungeons Codex"`; description from the entity description (≤ 155 chars) or category intro; canonical URL; Open Graph and Twitter card.
- JSON-LD: `BreadcrumbList` on category and detail pages.
