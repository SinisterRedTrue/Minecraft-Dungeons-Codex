# 03: Content Model (all schemas)

These definitions are **normative**. `src/lib/schemas/` must implement them exactly in Zod. If the real wiki data needs a change (a missing field, or a different enum value), update this file first, then log it in `10-DECISIONS-LOG.md`.

Legend: **R** = required (validation fails without it). **O** = optional (may be absent; the UI must handle that). Enums marked *(open)* are built from the data during sync and stored in `data/vocab/`, and the schema checks values against the vocab file.

## 1. Shared base: `BaseEntity`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `id` | `string` | R | `${game}:${category}:${slug}`, globally unique |
| `slug` | `string` | R | kebab-case of `name`; within a category a collision gets `-2`, `-3`… (logged in the coverage report) |
| `game` | `'d1' \| 'd2'` | R | |
| `category` | `CategorySlug` | R | see §2 |
| `name` | `string` | R | Display name exactly as on the wiki |
| `description` | `string` | O | In-game description / flavor text |
| `image` | `{ src: string; width: number; height: number; alt: string }` | O | `src` = `/images/{game}/{category}/{slug}.webp`. When it's missing, the UI shows a category placeholder icon |
| `rarity` | `Rarity` | O | D1: `common \| rare \| unique`; D2: `common \| rare \| special \| unique` |
| `dlc` | `string` (DLC slug) | O | Set when the entity is DLC-exclusive; must reference an existing D1 DLC entity (D2: free text until D2 has DLC entities) |
| `tags` | `string[]` | R | Normalized property tags (may be empty). Drive filters, e.g. `dual-wield`, `long-reach` |
| `related` | `string[]` (ids) | R | Variants, base item, and same-group items; may be empty |
| `source` | `{ title: string; url: string; revisionId: number; fetchedAt: string /* ISO */ }` | R | Exact wiki page and revision the data came from |
| `quality` | `'verified' \| 'partial'` | R | `partial` when any category-recommended field is missing |
| `overrides` | `{ field: string; reason: string; sourceUrl: string }[]` | O | Present when a manual override changed this entity |

## 2. Categories
```
D1: weapons | armor | enchantments | artifacts | dlcs | cosmetics | mobs | locations
D2: weapons | armor | enchantments | artifacts | talismans | quests | mobs | locations
```

## 3. Dungeons 1 schemas

### 3.1 `D1Weapon` (category `weapons`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `kind` | `'melee' \| 'ranged'` | R | |
| `weaponType` | `string` *(open)* | R | Base group, e.g. `sword`, `claymore`, `daggers`, `sickles`, `gauntlets`, `glaive`, `spear`, `axe`, `hammer`, `scythe`, `whip`, `pickaxe`, `katana`, `bow`, `crossbow`, … from the wiki "Group of" column |
| `isUnique` | `boolean` | R | From the "Unique" column |
| `baseItemId` | `string` | O | For unique variants: id of the base item |
| `variantIds` | `string[]` | R | For base items: unique variants (may be empty) |
| `stats` | `{ damage?: number; speed?: number; area?: number; [k: string]: number \| undefined }` | O | From `{{Infobox Dungeons item}}` `stat1..3`. **Prompt 03 must read `Template:Infobox Dungeons item` to map `stat1/2/3` to labels for melee vs ranged, and record that mapping here.** |
| `properties` | `string[]` | R | Raw property bullets (e.g. "Dual wield", "Spin attack") |
| `comboLength` | `number` | O | Melee only |
| `ammo` | `string` | O | Ranged only, e.g. `arrows` |
| `damageType` | `string` | O | From the infobox `damagetype` |
| `builtInEnchantments` | `{ enchantmentId: string; level?: number }[]` | R | May be empty |
| `acceptsSoulEnchantments` | `boolean` | R | |
| `locations` | `string[]` (location ids, or raw text if unresolved) | R | Where it drops |
| `isSeasonal` | `boolean` | R | Seasonal Trial reward |
| `powerTable` | `{ power: number; min: number; max: number }[]` | O | From the item page's power/damage table, if it has one; feeds the Power Forge |

### 3.2 `D1Armor` (category `armor`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `isUnique`, `baseItemId`, `variantIds`, `properties`, `builtInEnchantments`, `acceptsSoulEnchantments`, `locations`, `isSeasonal` | as above | | |
| `armorGroup` | `string` *(open)* | R | "Group of" |
| `damageReduction` | `number` (percent) | O | Parsed from a property like "35% Damage Reduction" |
| `effects` | `{ label: string; value?: number; unit?: '%' \| 's' \| 'flat' }[]` | R | Every parsed property with a number, e.g. `+30% Movement Speed` → `{label:'Movement Speed', value:30, unit:'%'}` |
| `baseHealth` | `number` | O | The wiki states 200 for all armor; store it if present |

### 3.3 `D1Enchantment` (category `enchantments`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `appliesTo` | `('melee' \| 'ranged' \| 'armor')[]` | R | |
| `tier` | `'common' \| 'powerful'` | R | |
| `isGilded` | `boolean` | R | Gilded variants are separate entities only if the wiki lists them separately; otherwise use `gildedDescription` |
| `gildedDescription` | `string` | O | |
| `levels` | `{ level: 1 \| 2 \| 3; text: string; value?: number; unit?: string }[]` | R | Tier I–III effect text, plus a parsed number where it exists |
| `pointCost` | `[number, number, number]` | R | Per-level costs. Common `[1,2,3]`, Powerful `[2,3,4]`, Gilded Common `[2,3,4]`, Gilded Powerful `[3,4,5]` |
| `stackable` | `boolean` | R | "Multiple per equipment" |
| `mobObtainable` | `boolean` | R | |
| `builtInto` | `string[]` (item ids) | R | |
| `section` | `'standard' \| 'exclusive' \| 'mob-exclusive'` | R | Unused enchantments are **excluded** |

### 3.4 `D1Artifact` (category `artifacts`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `artifactType` | `'damaging' \| 'status' \| 'quiver' \| 'summoning' \| 'agility' \| 'defensive'` | R | The wiki's section headings, normalized (`defensive` = Defensive/healing/cooperative) |
| `cooldownSeconds` | `number` | O | Parsed from "2.5 second cooldown" |
| `requiresSouls` | `boolean` | R | |
| `properties` | `string[]` | R | |
| `locations` | `string[]` | R | |
| `internalId` | `string` | O | |

Unused artifacts are **excluded**.

### 3.5 `D1Dlc` (category `dlcs`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `releaseDate` | `string` (ISO date) | O | |
| `order` | `number` | R | Release order 1..n |
| `summary` | `string` | R | |
| `locationIds` | `string[]` | R | Missions added |
| `contentCounts` | `{ weapons: number; armor: number; artifacts: number; mobs: number; enchantments: number }` | R | **Computed** at sync time by joining entities whose `dlc` = this slug |

### 3.6 `D1Cosmetic` (category `cosmetics`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `cosmeticType` | `'cape' \| 'pet' \| 'emote' \| 'flare' \| 'skin'` *(normalize from the wiki sections; extend via the decisions log if the wiki has more)* | R | |
| `obtainedFrom` | `string` *(open)*, e.g. `dlc`, `event`, `store`, `achievement`, `seasonal-adventure`, `hero-pass` | R | |
| `howToObtain` | `string` | O | Free text |
| `season` | `string` | O | |

### 3.7 `D1Mob` (category `mobs`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `mobType` | `string` *(open)*, e.g. `common`, `enchanted-capable`, `ancient`, `boss`, `mini-boss`, `passive`, `pet`, `summon` | R | From the wiki sections. Arcade-only mobs are **excluded** |
| `health` | `number \| string` | O | |
| `attacks` | `string[]` | R | |
| `locationIds` | `string[]` | R | |
| `drops` | `string[]` (item ids or text) | R | Ancients: their gilded/unique drops |
| `variants` | `string[]` | R | |

### 3.8 `D1Location` (category `locations`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `locationType` | `'mission' \| 'secret' \| 'dlc-mission' \| 'tower' \| 'camp' \| 'hub' \| 'other'` | R | |
| `region` | `string` | O | e.g. `Overworld`, `Nether`, `End`, `Jungle`, … |
| `mobIds` | `string[]` | R | |
| `itemIds` | `string[]` | R | **Computed**: entities whose `locations` include this location |
| `secretOf` | `string` (location id) | O | For secret levels |
| `recommendedPower` | `string` | O | |

## 4. Dungeons 2 schemas
Dungeons II pages are plain wikitables (no infobox). Rarity enum: `common | rare | special | unique`.

### 4.1 `D2Weapon`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `kind` | `'melee' \| 'ranged'` | R | |
| `weaponType` | `string` *(open)* | R | Melee: from section/combo grouping; ranged: `bow \| crossbow` |
| `effect` | `string` | R | "Effect" column |
| `effectValues` | `{ label: string; value: number; unit: '%' \| 's' \| 'flat' }[]` | R | Numbers parsed from `effect` (may be empty) |
| `comboLength` | `number` | O | Melee |
| `ammo` | `string` | O | Ranged |
| `locations` | `string[]` | R | "Drop location" |
| `obtainable` | `boolean` | R | `false` for the "Unobtainable" list. These are **shown**, with a badge, and hidden by default through a filter |

### 4.2 `D2Armor`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `slot` | `'helmet' \| 'chestplate' \| 'leggings' \| 'boots'` | R | |
| `armorSet` | `string` | R | "Armor Set" column (set slug + display name) |
| `effects` | `string[]` | R | |
| `effectValues` | as above | R | |
| `locations` | `string[]` | R | |

### 4.3 `D2Enchantment`
Same shape as `D1Enchantment`. **Prompt 05 must check this against `Dungeons_II:Enchantment`** and update this section (log it) where D2 differs.

### 4.4 `D2Artifact`
Same shape as `D1Artifact`, with `artifactType` *(open)*. Prompt 05 checks it against `Dungeons_II:Artifact`.

### 4.5 `D2Talisman`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `passiveBonus` | `string` | R | |
| `boostType` | `'ranged' \| 'movement' \| 'drops' \| 'artifact' \| 'melee' \| 'health' \| 'pet' \| 'damage' \| 'souls' \| 'experience'` *(extend via the log if needed)* | R | |
| `isSecret` | `boolean` | R | |
| `tiers` | `[{tier:1;text:string;value?:number;unit?:string},{tier:2;…},{tier:3;…}]` | R | T1–T3 (bronze/silver/gold frames) |
| `sourceType` | `'quest-reward' \| 'secret-chest' \| 'boss-drop' \| 'other'` | R | |
| `locations` | `string[]` | R | |

### 4.6 `D2Quest`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `questType` | `'core' \| 'side'` | R | Unused quests are **excluded** |
| `order` | `number` | O | Core quest order |
| `locationIds` | `string[]` | R | |
| `rewards` | `{ when: 'first' \| 'subsequent' \| 'always'; xp?: number; items: string[] /* ids or text */; randomFrom?: string[] }[]` | R | |
| `dlcExclusive` | `boolean` | R | |

### 4.7 `D2Mob`, 4.8 `D2Location`
Same shapes as `D1Mob` / `D1Location`, with `*Type` fields *(open)*. Prompt 05 checks them against `Dungeons_II:Mob` and `Dungeons_II:Location` and records the normalized enums here.

## 5. Cross-reference rules (`npm run data:validate` enforces them)
- Every id in `related`, `baseItemId`, `variantIds`, `builtInEnchantments[].enchantmentId`, `builtInto`, `locationIds`, `mobIds`, `itemIds` and `dlc` must resolve to an existing entity in the **same game**. Values in `locations`/`drops` may be raw text **only if** they're listed in the coverage report under "Unresolved references".
- Every `image.src` must exist on disk.
- `id` values are unique across the game; slugs are unique within a category.
- Generated JSON is sorted by `name` (case-insensitive) for stable diffs.

## 6. `EntityListItem` projection
For each category, `src/config/categories.ts` declares `listFields` (the fields needed by its cards, table columns and filters). The loader `getListItems(game, category)` returns `Pick<Entity, 'id'|'slug'|'name'|'image'|'rarity'|'dlc'|'tags'|'quality'> & listFields`.
