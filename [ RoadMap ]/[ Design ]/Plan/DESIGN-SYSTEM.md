# Dungeons Codex: Design System

> Written so that **Claude or Codex** can build the UI from this file alone. Tokens are in `../Tokens/tokens.css`, and page layouts are in `../Wireframes/WIREFRAMES.md`.

## 1. Design idea in one line
**"civilization.gg's chunky, friendly, rounded 3D UI, carried into a torch-lit Minecraft Dungeons crypt."** Warm night stone, emerald (D1) or frost cyan (D2) accents, gold for *unique*, pixel-crisp item icons in framed slots.

## 2. What we take from civilization.gg (layout and feel only)
| civ pattern | Measured value | Our use |
|---|---|---|
| **b3d buttons**: vertical gradient, solid bottom edge shadow, glow | `linear-gradient(#FFD056,#FFAD1D)`, `box-shadow: 0 5px 0 #C77206, 0 14px 26px -10px rgba(232,137,12,.55)`, radius 12 px, 800 weight, uppercase, 0.04 em tracking, padding 12×20 | `Button3D` in accent/gold/stone/redstone variants |
| Press physics | hover `translateY(-2px)` + edge 7 px; active `translateY(3px)` + edge 2 px; transition 120 ms | Identical |
| **Cards** | white, radius 20 px, 1.7 px border `#EFE3C6`, `0 6px 0 #E8DABA` edge + soft drop `0 20px 40px -24px` | `Card` (surface-1, line border, surface-edge depth) |
| Card hover | `.feat:hover { translateY(-4px) }` | Cards lift −4 px; framed icons glow |
| **Sticky nav** | translucent cream `rgba(255,252,243,.92)`, radius `0 0 24px 24px`; changes on scroll (`#hdr.scrolled`) | Translucent `--nav-bg` + `backdrop-filter: blur(12px)`; gains a shadow and shrinks 68→56 px after 24 px of scroll |
| Nav link hover | `rgba(255,182,39,.25)` pill background | Accent at 20 % alpha, pill shape |
| **Typography** | Rubik everywhere; headings 900 uppercase at 32 px | Rubik 900 uppercase display + Rubik body; **Silkscreen** pixel font for badges and stat numbers (Dungeons flavor) |
| **Hero** | night photo background, huge logo, tagline, two big CTAs, search pill, chevron, wavy bottom edge | Night gradient + torch glow + floating item icons, wordmark, CTAs, Codex Search pill, **wave divider** |
| Section rhythm | 92 px vertical padding, alternating cream / cream-2 bands, max width 1180 | 92 px, alternating `--bg` / `--bg-2`, max width 1240 |
| **Reveal on scroll** | `opacity 0 → 1`, `translateY(26px) → 0`, 600 ms, `cubic-bezier(.2,.7,.2,1)` | Identical (IntersectionObserver, once), disabled under reduced motion |
| Chips | `button.mchip:hover { translateY(-2px); border accent }` | `Chip` / TypeSelector chips |
| Leaderboard rows | row hover tint `rgba(232,137,12,.07–.1)` | `EntityTable` row hover tint with the accent |

**Do not copy:** server IP boxes, Discord/store CTAs, leaderboard or poll content, the civ logo, their imagery.

## 3. Minecraft Dungeons flavor
- **Framed item slots** (`RarityFrame`): a square slot with an inner dark bevel and a 2 px border in the rarity color. Unique gets an animated slow gold shimmer (a conic-gradient border rotating over 6 s, static under reduced motion). The icon is pixelated and centered at 70 % of the slot.
- **Rarity language:** the color plus a text label always appear together (never color alone).
- **Torchlight:** hero and section headers carry a soft radial glow (`--torch`) in a top corner.
- **Stone texture:** an optional 4 % opacity noise/stone SVG overlay on `--bg`, as a tiny inline data URI under 2 kB.
- **Souls:** soul-related badges use `--soul` with a faint glow.
- **Emerald counters:** counts and "points used" use the pixel font with a tiny emerald gem icon.

## 4. Typography scale
| Token | Use | Font / weight / case |
|---|---|---|
| `--fs-hero` | Wordmark on `/` | display 900, uppercase, `text-shadow: 0 4px 0 var(--accent-edge), 0 10px 30px var(--accent-glow)` |
| `--fs-h1` | Page titles | display 900, uppercase |
| `--fs-h2` | Section titles | display 900, uppercase (civ: 32 px) |
| `--fs-h3` | Card titles | body 700 |
| `--fs-body` | Text | body 400/500, line-height 1.6 |
| `--fs-small` | Meta | body 500 |
| `--fs-micro` | Badges, stat numbers | pixel 400, uppercase, tracking 0.06 em |

Load with `next/font/google`: `Rubik` (400, 500, 600, 700, 800, 900) and `Silkscreen` (400), exposed as `--font-rubik` and `--font-silkscreen`.

## 5. Color usage rules
- Backgrounds: `--bg` for the page; alternating bands use `--bg-2`; cards use `--surface-1`; inputs and hover use `--surface-2`.
- Text: `--text`, `--text-muted` (secondary), `--text-faint` (only for placeholder or disabled text, never for meaningful text).
- **Accent** (`--accent`) is per game: D1 emerald, D2 frost. Primary buttons, active chips, focus rings, links (`--accent-text`).
- **Gold** = Unique and featured. **Redstone** = destructive or errors. **Soul** = soul-related.
- Contrast: all text meets WCAG AA (4.5:1 body, 3:1 large and UI) in **both** themes. Prompt 02 checks every token pair it uses with a contrast script and logs the results.

## 6. Components (build in Prompt 02; showcase at `/dev/ui`)
| Component | Spec |
|---|---|
| `Button3D` | Variants `accent \| gold \| stone \| redstone \| ghost`; sizes `sm` (h 36), `md` (h 44), `lg` (h 56); uppercase 800; radius `--radius-btn`; gradient `accent-hi → accent`; edge `0 var(--depth-btn) 0 var(--accent-edge)` + glow; hover/active physics per §2; `disabled` = 50 % opacity, no physics; works as a link (`asChild`); optional leading icon |
| `Card` | `surface-1`, 1.5 px `--line` border, radius `--radius-card`, `box-shadow: 0 var(--depth-card) 0 var(--surface-edge), var(--shadow-soft)`; `interactive` prop adds hover lift and focus ring; padding 20/28 |
| `Panel` | Like Card with `--radius-panel`; used for the Infobox, Forge and Compare |
| `Chip` | Pill, h 36, `surface-2`, `--line` border; `selected` = accent background + `accent-ink` text + a 3 px accent-edge bottom edge; shows a count bubble; hover −2 px |
| `Badge` | Pixel font, micro, radius 6, tinted background (12 % of color) + colored text/border; variants: rarity ×4, `dlc`, `unique`, `seasonal`, `soul`, `approximate` (gold dashed outline), `partial`, `unobtainable` |
| `RarityFrame` | sizes 48 / 72 / 128 / 192; see §3 |
| `StatBar` | Label, pixel-font value, a bar filled relative to the category max, animated width (200 ms); optional "approximate" dot |
| `RangeSlider` | Radix Slider with 2 thumbs, round 22 px thumbs with a 3D edge, accent track, number inputs under it, keyboard steps |
| `Slider` | Single thumb (Power Forge) with tick marks |
| `Dialog` / `Sheet` | Radix; `--overlay` backdrop; panel radius 24 (Sheet: top corners only, drag handle); focus trap; Esc closes |
| `Tabs`, `ToggleGroup`, `Tooltip`, `Popover`, `Select`, `Checkbox`, `Switch`, `Toast` | Radix, styled with tokens |
| `Skeleton` | Shimmer on `surface-2` (static under reduced motion) |
| `EmptyState` | Pixel-art style illustration (an inline SVG of an empty chest), title, text, action |
| `WaveDivider` | Inline SVG wave, filled with the next section's background |
| `SectionHeading` | Eyebrow (pixel, accent) + H2 (display) + optional subtitle; centered or left |

## 7. Entity presentation
- **EntityCard** (grid): `Card interactive`; top is a `RarityFrame` 72 px, centered; name (h3, 2-line clamp); a meta line (type · DLC); up to 2 key stats in pixel font (from category config); corner actions ★ and ⇄ (visible on hover/focus, always visible on touch). The whole card is one link; the action buttons stop propagation and have their own labels.
- **EntityTable**: sticky header, zebra rows in `--bg-2`, row hover accent tint, a 32 px icon column, sortable headers (aria-sort).
- **Infobox**: a Panel with a large frame at the top, then a `<dl>` grid of label/value rows and the source credit at the bottom.

## 8. Motion
- Press: 120 ms. UI: 200 ms. Reveal: 600 ms with `--ease-out`, staggered 40 ms per card (max 8).
- The game picker cards tilt slightly in 3D on pointer move (max 4°, desktop only, off under reduced motion).
- Hero item icons float (6 s sine, ±8 px).
- Route changes: none (instant), to keep things fast.

## 9. Responsive
| Breakpoint | Layout |
|---|---|
| < 640 | 1 column (cards 2 columns at ≥ 360 px), bottom-sheet filters, hamburger nav |
| 640–1023 | 2–3 card columns, filters in a sheet |
| ≥ 1024 | Sticky left filter panel 280 px + results; full nav |
| ≥ 1440 | Content max width 1240, centered |

## 10. Iconography
- UI icons: lucide, 20 px, stroke 2.
- Category icons on hub tiles: use a representative item image from our own data (e.g. the Weapons tile uses the Sword icon) so no extra art is needed.
- Brand: the "DUNGEONS CODEX" wordmark plus a simple emerald-gem-over-book SVG mark (made in Prompt 02, ≤ 2 kB, no Mojang assets).

## 11. Accessibility checklist (every component)
Visible focus ring (`--focus-ring`) · keyboard operable · ≥ 44 px targets · labels on icon buttons · color never the only signal · `aria-live` for result counts ("42 results") · reduced motion respected · AA contrast in both themes.
