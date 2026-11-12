# Prompt 06: App Shell, Game Picker & Game Hubs

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 05.
**Read first:** `[ Plans ]/05-ROUTES-AND-PAGES.md` (global layout, `/`, `/[game]`, `/about`, 404, metadata); `09-LEGAL-AND-ATTRIBUTION.md`; `[ Design ]/Plan/DESIGN-SYSTEM.md` §2, §3, §8, §9; `[ Design ]/Wireframes/WIREFRAMES.md` §1–2; and look at `References/civilization-gg-hero.jpg` again.

## Goal
Real navigation: the Game Picker (`/`), both Game Hubs, header, footer, About/Credits, 404, sitemap and robots. Everything is static and tested.

## Tasks
1. **Root layout** (`app/layout.tsx`): only `<html>`/`<body>`, fonts, tokens, the theme script, `ToastProvider`, the nuqs adapter (`NuqsAdapter` for the App Router) and `metadataBase` from `NEXT_PUBLIC_SITE_URL`. **No header or footer here.**
2. **Shell per section (so the accent is right in the server HTML, with no flash):**
   - `components/layout/SiteShell.tsx` renders: skip link, `SiteHeader`, `<main id="main">{children}</main>`, `SiteFooter`. It takes an optional `game` prop.
   - `app/(site)/layout.tsx` (route group for `/`, `/about`, `/favorites`): `<div data-game="d1"><SiteShell>…</SiteShell></div>` (the neutral pages use the D1 emerald accent).
   - `app/[game]/layout.tsx`: validates `game` (`generateStaticParams` → d1, d2; `dynamicParams=false`) and renders `<div data-game={game}><SiteShell game={game}>…</SiteShell></div>`. tokens.css re-declares the derived tokens on `[data-game]`, so header, main and footer all get the right accent.
   - `not-found.tsx` renders its own `SiteShell` inside `data-game="d1"`.
3. **SiteHeader:** sticky; translucent `--nav-bg` + blur; radius `--radius-nav`; scroll state after 24 px (shrinks + shadow); logo/wordmark; `GameSwitcher` (segmented D1/D2 pill that keeps the current category when it exists in the other game, otherwise goes to that game's hub); category links for the current game (≥ lg) or a "Sections" menu; Search button (opens a placeholder dialog until Prompt 09; it must exist and be labeled); Favorites link with a count badge (reads storage; 0 until Prompt 11); ThemeToggle. Mobile: a hamburger → Sheet with every link.
4. **SiteFooter:** per `09-LEGAL…` (license line, exact disclaimer text, last synced date from `getSyncDate`), plus links.
5. **`/` Game Picker** per Wireframe §1: Hero (night gradient, torch glow, 10–14 floating item icons taken from real data, preferring uniques; deterministic choice), Wordmark, tagline, search pill (opens the palette), a chevron that scrolls to the cards, WaveDivider. **GameCards** (icon collage from data, title, year, live counts from `getCounts`, Button3D in the game accent, pointer tilt ≤ 4° on desktop, off under reduced motion). "What's inside" feature cards (6) with Reveal.
6. **`/[game]` Hub** per Wireframe §2: hero band with the synced chip; 8 section tiles (icon = a representative entity image from config, count, description); Featured uniques scroller (8, deterministic by build date); D1 DLC strip; Tools row. Tiles link to `/[game]/[category]`, which shows a temporary "Coming in Prompt 07" EmptyState page (statically generated for all 16 categories, so links never 404).
7. **`/about`:** About, How to use, Credits (Minecraft Wiki contributors, license, link), "What we changed", Privacy paragraph, disclaimer, per-game data freshness.
8. **`not-found.tsx`:** friendly 404 (empty-chest EmptyState, search button, links to both hubs).
9. **Breadcrumbs component** (with BreadcrumbList JSON-LD) used on the hub, about and stub pages.
10. **SEO:** `generateMetadata` for each page per `05-ROUTES…`; `app/sitemap.ts` (/, hubs, about, all 16 category URLs, and later all detail URLs, generated from the loaders so it grows automatically); `app/robots.ts`.
11. **Tests:** e2e `picker.spec.ts`, `hub.spec.ts`, plus the nav parts of `mobile.spec.ts` (hamburger opens; no horizontal scroll on `/`, `/d1`, `/d2`, `/about`); unit test GameSwitcher's target-URL logic.

## Mini-checklist
- [ ] Root layout (theme, toasts, nuqs, skip link, header, footer)
- [ ] `[game]` layout with correct accent server-side (no flash) for d1 and d2
- [ ] Header: sticky + scroll state + GameSwitcher + nav + search button + favorites + theme + mobile sheet
- [ ] Footer with exact legal text + sync date
- [ ] Game Picker matches Wireframe §1 (hero, cards with live counts, feature cards, wave)
- [ ] Both hubs match Wireframe §2 (8 correct tiles each, featured, DLC strip on d1, tools)
- [ ] 16 category stub pages exist (no 404s from the hubs)
- [ ] About/Credits, 404, Breadcrumbs + JSON-LD
- [ ] Metadata, sitemap, robots
- [ ] picker/hub/mobile e2e + GameSwitcher unit tests pass
- [ ] Visual check: `/`, `/d1`, `/d2` in both themes at 1440/390 compared with the wireframes and civ references
- [ ] axe: 0 serious/critical on `/`, `/d1`, `/d2`, `/about`, 404

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(app): app shell, game picker, game hubs, about and SEO basics`
