# Wireframes (ASCII, desktop 1440 → mobile 390)

Legend: `[BTN]` = Button3D, `( chip )` = Chip, `▣` = RarityFrame icon, `★` favorite, `⇄` compare.

## 1. `/` Game Picker
```
┌──────────────────────── sticky rounded nav (translucent) ─────────────────────────┐
│ ◆ DUNGEONS CODEX        [D1|D2]               🔍 Search ⌘K    ★ 3    ☾            │
└───────────────────────────────────────────────────────────────────────────────────┘
███████████████████████ HERO (night gradient + torch glow, floating icons) █████████
█            ▣         ▣                                ▣          ▣              █
█                    D U N G E O N S   C O D E X   (3D text shadow)               █
█        Every weapon, armor, enchantment and mob of Dungeons I & II.             █
█             ┌───────────────── 🔍 Search the Codex… ─────────── [SEARCH] ┐      █
█                                   ⌄                                             █
████████████████████████████████████▁▂▃▄▅ wave ▅▄▃▂▁████████████████████████████████
                         CHOOSE YOUR ADVENTURE   (eyebrow + H2)
   ┌─────────────────────────────────────────────────────────────────────────────┐
   │ ▣ ▣ ▣ ▣ ▣  (emerald scene)  ╲            ╲  (frost scene)  ▣ ▣ ▣ ▣ ▣        │
   │                              ╲  one diagonal divider 40%→60%╲                │
   │ MINECRAFT DUNGEONS           ╲            ╲ MINECRAFT DUNGEONS II           │
   │ 2020 · 155 weapons · 71 armor ╲            ╲ 2026 · 80 weapons · 24 tal.    │
   │     [ ENTER DUNGEONS ]         ╲            ╲   [ ENTER DUNGEONS II ]       │
   └─────────────────────────────────────────────────────────────────────────────┘
   Hover/focus a half: the divider slides 9 points toward the other side (same angle).
                              WHAT'S INSIDE  (bg-2 band)
   ┌ Filters ┐ ┌ Power Forge ┐ ┌ Compare ┐ ┌ Build Planner ┐ ┌ Favorites ┐ ┌ Search ┐
   (6 feature cards, 3×2, reveal-on-scroll, hover lift)
──────────────────────────────────── footer ─────────────────────────────────────────
 ◆ DUNGEONS CODEX   D1 · D2 · Favorites · About     Data © Minecraft Wiki · CC BY-NC-SA
 NOT AN OFFICIAL MINECRAFT PRODUCT…                              Last synced 2026-11-12
```
Mobile (below `lg`): the two halves stack with a slanted seam, the hero wordmark wraps onto 2 lines, and the feature cards are 1 column.

## 2. `/d1` Game Hub
```
 nav (D1 active, accent = emerald) + category links: Weapons Armor Enchantments … Locations
 ┌──────────────────── hero band (bg-2, torch glow) ─────────────────────────────────┐
 │ MINECRAFT DUNGEONS                                     ( synced 2026-11-12 )      │
 │ Explore 600+ entries across 8 sections.                                          │
 └───────────────────────────────────────────────────────────────────────────────────┘
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ ▣ WEAPONS│ │ ▣ ARMOR  │ │ ▣ ENCHANT│ │ ▣ ARTIF. │    4×2 section tiles
 │ 155      │ │ 71       │ │ 90       │ │ 38       │    (icon, label, count, 1-line desc)
 └──────────┘ └──────────┘ └──────────┘ └──────────┘
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ ▣ DLCS   │ │ ▣ COSMET.│ │ ▣ MOBS   │ │ ▣ LOCAT. │
 └──────────┘ └──────────┘ └──────────┘ └──────────┘
 FEATURED UNIQUES   ◀ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▣ ▶         (scroll-snap row)
 DLC ADVENTURES     [Jungle Awakens][Creeping Winter][Howling Peaks]…  (release order)
 TOOLS              [ COMPARE ] [ BUILD PLANNER ] [ FAVORITES ]
```
Mobile: 2×4 tiles.

## 3. `/d1/weapons` Category Browser
```
 Home › Minecraft Dungeons › Weapons
 WEAPONS  155                                      "Swords, daggers, bows and more."
 STEP 1 ─ TYPE   ( All 155 ) ( Melee 83 ) ( Ranged 72 )
                 └─ when Melee: ( Sword 9 ) ( Daggers 6 ) ( Claymore 5 ) ( Glaive 4 ) …
 ┌──────── FILTERS (sticky 280) ─────┐  42 results  [Daggers ✕][Damage 10–40 ✕] Clear all
 │ 🔍 Search in results               │                    Sort: Damage ↓ ▾   [▦ grid|☰ table]
 │ DAMAGE        ●━━━━━━━━●  10 – 40  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
 │ ATTACK SPEED  ●━━━━━━━━●           │  │  ▣  ★│ │  ▣  ★│ │  ▣  ★│ │  ▣  ★│
 │ PROPERTIES    ☑ Dual wield (14)    │  │Name  │ │Name  │ │Name  │ │Name  │
 │               ☐ Spin attack (6) …  │  │DMG 12│ │…     │ │…     │ │…     │
 │ RARITY        ☐ Common ☐ Rare ☐ U. │  └──────┘ └──────┘ └──────┘ └──────┘
 │ ☐ Unique only  ☐ Soul enchants     │  … grid (auto-fill, min 180)
 │ DLC ▾  LOCATION ▾  BUILT-IN ENCH ▾ │
 │ COMBO LENGTH ●━━● (melee only)     │
 └────────────────────────────────────┘
 ┌──────────────── compare tray (sticky bottom when ≥1) ─────────────────────────────┐
 │ ▣ ▣ ▣  3/4 selected                                         [ COMPARE ]  Clear     │
 └────────────────────────────────────────────────────────────────────────────────────┘
```
Mobile: the type chips scroll horizontally; a `[ FILTERS (3) ]` button opens a bottom Sheet with "Show 42 results" and "Clear" footer buttons. Cards are 2 columns.

## 4. `/d1/weapons/claymore` Detail
```
 Home › Minecraft Dungeons › Weapons › Claymore                       ◀ prev  next ▶
 ┌─────┐  CLAYMORE                                       [★ FAVORITE] [⇄ COMPARE]
 │ ▣▣▣ │  (RARE) (Melee) (Claymore) (Base game)                       [⚒ PLANNER]
 └─────┘
 ┌────────── main ───────────────────────────────┐ ┌──── INFOBOX (panel) ─────────┐
 │ "A heavy blade…" (description)                 │ │       ▣ 128                  │
 │ STATS     Damage ████████░░ 11.5               │ │ Type      Melee · Claymore   │
 │           Speed  ███░░░░░░░ 1                  │ │ Rarity    Rare               │
 │ PROPERTIES • Large sweeping attacks …          │ │ Combo     3                  │
 │ ┌──────────── POWER FORGE ──────────────────┐  │ │ Soul ench. No                │
 │ │ Power ●━━━━━━━━━━━━━━━━━━━━━  [ 100 ]     │  │ │ Variants  Broadsword,        │
 │ │       |250 |256 |263                      │  │ │           Heartstealer       │
 │ │ Slot 1 [Sharpness ▾][I|II|III]            │  │ │ Found in  Creeper Woods, …   │
 │ │ Slot 2 [ + add ]   Slot 3 [ + add ]       │  │ │ ───────────────────────────  │
 │ │ Points 3 ◆                                │  │ │ Source: Minecraft Wiki ↗     │
 │ │ ─────────── RESULT ───────────            │  │ └──────────────────────────────┘
 │ │ Damage/hit  1,842 – 1,918 (+33% → 2,450…) │  │ BUILT-IN ENCHANTMENTS
 │ │ (APPROXIMATE) when interpolated off-table  │  │ WHERE TO FIND (location chips)
 │ │ [RESET] [SHARE]                           │  │
 │ └───────────────────────────────────────────┘  │
 └────────────────────────────────────────────────┘
 RELATED  ▣ ▣ ▣ ▣ ▣ ▣
 Data and image from Minecraft Wiki: Dungeons:Claymore (rev 123456) · CC BY-NC-SA 3.0
```
Mobile: the header stacks, the infobox moves directly under the header, and the Forge goes full width.

## 5. `/d1/compare?c=weapons&items=a,b,c`
```
 COMPARE WEAPONS                            [☐ Differences only]   [ + ADD ITEM ]
 ┌────────────┬──────────────┬──────────────┬──────────────┐
 │            │ ▣ Claymore ✕ │ ▣ Katana   ✕ │ ▣ Daggers  ✕ │  (sticky header row)
 ├────────────┼──────────────┼──────────────┼──────────────┤
 │ Damage     │ 11.5 ◆best   │ 7            │ 4            │
 │ Speed      │ 1            │ 1.4 ◆best    │ 2.1 ◆best?   │
 │ Properties │ • Sweep …    │ • Fast …     │ • Dual wield │
 └────────────┴──────────────┴──────────────┴──────────────┘
```

## 6. `/d1/planner`
```
 BUILD PLANNER   [ My build ✎ ]  Power [ 200 ]      [COPY LINK] [SAVE] [CLEAR]
 ┌──── GEAR ─────────────────────────────┐ ┌──── SUMMARY ───────────────────┐
 │ ▣ MELEE    Claymore   [I][II][III] ×3 │ │ Enchantment points  14 ◆       │
 │ ▣ RANGED   + choose                    │ │ Melee dmg/hit  ~1,800 (APPROX) │
 │ ▣ ARMOR    Hero's Armor  ench ×3       │ │ Effects                         │
 │ ▣ ART 1  ▣ ART 2  ▣ ART 3              │ │  +30% Movement Speed            │
 └───────────────────────────────────────┘ │  -25% Artifact cooldown        │
                                           │ ⚠ Duplicate artifact            │
 MY BUILDS  [Build A] [Build B] …          └─────────────────────────────────┘
```
D2 adds Helmet, Chestplate, Leggings, Boots and Talisman slots.

## 7. Search palette
```
 ┌──────────────── 🔍  clay│                 [This game | Both] ─┐
 │ WEAPONS   ▣ Claymore            D1   ↵                          │
 │           ▣ Clay Golem Hammer?  D1                              │
 │ MOBS      ▣ …                                                    │
 │ ↑↓ navigate · ↵ open · Ctrl+↵ add to compare · Esc close        │
 └──────────────────────────────────────────────────────────────────┘
```
