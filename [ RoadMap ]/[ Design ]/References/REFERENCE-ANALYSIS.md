# Reference Analysis (captured 2026-11-12)

## Files in this folder
| File | What it shows |
|---|---|
| `civilization-gg-hero.jpg` | civilization.gg hero: translucent sticky nav, gold 3D "STORE" button, huge logo, tagline, gold + blurple 3D CTAs, rounded search pill with a gold button, chevron, wavy cream bottom edge |
| `minecraft-wiki-dungeons-hub.jpg` | minecraft.wiki `Dungeons:Wiki` hub: the franchise tab bar and the 8 Minecraft Dungeons section tiles (Weapons, Armor, Enchantments, Artifacts, DLCs, Cosmetics, Mobs, Locations), with the Dungeons II block below |

## civilization.gg: measured design tokens (from computed CSS)
```css
:root {
  --cream:#FBF4E2; --cream-2:#F4E7CB; --ink:#33230F; --brown:#7A6748; --brown-2:#A9946F;
  --gold:#FFB627; --gold-hi:#FFD056; --gold-deep:#E8890C; --gold-edge:#C77206;
  --red:#E23D28; --red-edge:#A82818; --card:#FFFFFF; --card-line:#EFE3C6; --card-edge:#E8DABA;
  --night:#191410; --night-2:#221B13; --night-line:rgba(255,255,255,.12);
  --blurple:#5865F2; --blurple-edge:#3E48C4; --green:#3BAE5C; --maxw:1180px;
  --display:'Rubik'; --body:'Rubik';
}
```
- **Gold 3D button** (`.b3d.b3d-gold`): `background: linear-gradient(#FFD056, #FFAD1D)`, `color:#5C3A00`, 800 weight, uppercase, 14 px, letter-spacing 0.56 px, padding 12 × 20, radius 12 px, `box-shadow: 0 5px 0 #C77206, 0 14px 26px -10px rgba(232,137,12,.55)`, `transition: transform .12s, box-shadow .12s, filter .12s`.
  - `:hover` → `translateY(-2px)`, edge 7 px, glow `0 18px 30px -10px rgba(232,137,12,.6)`
  - `:active` → `translateY(3px)`, edge 2 px
- **Cards** (`.card`, `.board`): white, radius 20 px (boards 24 px), border 1.71 px `#EFE3C6`, `box-shadow: 0 6px 0 #E8DABA, 0 20px 40px -24px rgba(51,35,15,.25)`, padding 28 px.
- **Feature cards** (`.feat:hover`): `translateY(-4px)`.
- **Reveal**: `.reveal { opacity:0; transform:translateY(26px); transition: opacity .6s, transform .6s cubic-bezier(.2,.7,.2,1) } .reveal.in { opacity:1; transform:none }`.
- **Nav**: mobile drawer `rgba(255,252,243,.98)` with radius `0 0 24px 24px`; a `#hdr.scrolled` state changes link colors; link hover is a gold 25 % pill.
- **Menu button**: radius 12, `0 4px 0 rgba(51,35,15,.12)` edge.
- **Headings**: Rubik 900, 32 px, uppercase. Body is Rubik 600, 16 px.
- **Section order**: Hero (night `#1A1206`, padding 110/120) → About cards (padding 64/92) → Leaderboard band (`--cream-2`, 92 px) → How to join (92 px) → Community CTA (night) → Footer.
- **Chips** (`button.mchip:hover`): `translateY(-2px)`, border goes to the gold-deep tint.

## minecraft.wiki Dungeons: information architecture
- Hub sections exactly match our 8 + 8 categories.
- **D1 weapon data**: Melee / Ranged (ammo, bows, crossbows). Columns: Icon, Name + Level ID, Group of, Unique, DLC exclusive, Accepts soul enchantments, Properties, Combo length, Built-in enchantment, Obtainable location. Infobox `{{Infobox Dungeons item}}` with `stat1..3`. Some item pages have Power → Min/Max damage tables (e.g. Claymore).
- **D1 armor**: same column pattern; damage reduction is a property bullet; base health is 200.
- **D1 enchantments**: Melee/Ranged/Armor/Exclusive/Mob-exclusive/Unused; tiers I–III; cost table Common 1/2/3, Powerful 2/3/4, Gilded Common 2/3/4, Gilded Powerful 3/4/5.
- **D1 artifacts**: Damaging, Status-inflicting, Quiver, Summoning, Agility, Defensive/healing/cooperative; cooldowns 1.5 s–30 s.
- **D2 weapons**: Icon, Name, Rarity (COMMON/RARE/SPECIAL/UNIQUE), Effect, Combo length / Ammo, Drop location. 58 melee + 12 bows + 10 crossbows (+4 unobtainable).
- **D2 armor**: slots Helmet/Chestplate/Leggings/Boots, an Armor Set column, effects as text. 38 sets.
- **D2 talismans**: Passive Bonus, Secret, Boost Type, T1/T2/T3, Location. 24 total.
- **D2 quests**: core (15) + side (27); Location(s), Rewards (XP + items, first/subsequent), DLC exclusive.
- License: CC BY-NC-SA 3.0.

## What we do *better* than the wiki (the opportunity)
1. Type-first browsing plus real filters (the wiki only has long tables).
2. Consistent cards and detail pages across both games.
3. Power Forge, Compare and Build Planner.
4. Mobile-first and fast.
5. Cross-links computed both ways (a location page lists every item that drops there).
