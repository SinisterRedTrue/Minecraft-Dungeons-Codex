# 03: Content Model (all schemas)

These definitions are **normative**. `src/lib/schemas/` must implement them exactly in Zod. If the real wiki data needs a change (a missing field, or a different enum value), update this file first, then log it in `10-DECISIONS-LOG.md`.

Legend: **R** = required (validation fails without it). **O** = optional (may be absent; the UI must handle that). Enums marked *(open)* are built from the data during sync and stored in `data/vocab/{game}/enums.json` (`{ "weaponType": ["sword", …], … }`), and the schema checks values against that file; a field with no entry accepts any non-empty string (D-032).

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
| `stats` | `{ damage?: number; speed?: number; area?: number; [k: string]: number \| undefined }` | O | From `{{Infobox Dungeons item}}` `stat1..3` (`scripts/wiki/statMap.ts`, D-034). The `stat` param picks the labels: **`stat = melee`** → `stat1` "Power" → `damage`, `stat2` "Speed" → `speed`, `stat3` "Area" → `area`; **`stat = ranged`** → `stat1` "Power" → `damage`, `stat2` "Speed" → `speed`, `stat3` "Ammo" → `ammo`. Values are bar ratings on a **0–14** scale (the template draws `value / 14 × 100 %`). Ranged `stat4` is "Charge" (`fast` \| `slow`), not numeric, so it is not stored in `stats`. Armor has no stat bars. Checked against the rendered infoboxes of Claymore, Katana and Hunting Bow |
| `properties` | `string[]` | R | Raw property bullets (e.g. "Dual wield", "Spin attack") |
| `comboLength` | `number` | O | Melee only |
| `ammo` | `string` | O | Ranged only, e.g. `arrows` |
| `damageType` | `string` | O | From the infobox `damagetype` |
| `builtInEnchantments` | `{ enchantmentId: string; level?: number }[]` | R | May be empty |
| `acceptsSoulEnchantments` | `boolean` | R | |
| `locations` | `string[]` (location ids, or raw text if unresolved) | R | Where it drops |
| `isSeasonal` | `boolean` | R | Seasonal Trial reward |
| `powerTable` | `{ power: number; min: number; max: number }[]` | O | From the item page's `Power \| Min damage \| Max damage` table, if it has one; feeds the Power Forge. Each wiki damage cell is a range (`18-19`), so `min` = low end of "Min damage" and `max` = high end of "Max damage" (Claymore power 1: `18-19` / `32-34` → `{1, 18, 34}`; D-035) |

### 3.2 `D1Armor` (category `armor`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `isUnique`, `baseItemId`, `variantIds`, `properties`, `builtInEnchantments`, `acceptsSoulEnchantments`, `locations`, `isSeasonal` | as above | | |
| `armorGroup` | `string` *(open)* | R | "Group of" |
| `damageReduction` | `number` (percent) | O | Parsed from a property like "35% Damage Reduction" |
| `effects` | `{ label: string; value?: number; unit?: '%' \| 's' \| 'flat' }[]` | R | Every parsed property with a number, e.g. `+30% Movement Speed` → `{label:'Movement Speed', value:30, unit:'%'}` |
| `baseHealth` | `number` | O | The wiki states 200 for all armor; store it if present |
| `powerTable` | `{ power: number; min: number; max: number }[]` | O | From the armor page's `Power \| Min health \| Max health` table (the same layout as weapons, but health added at that power; `parsePowerTable(…, { measure: 'health' })`); feeds the Power Forge (D-042) |

### 3.3 `D1Enchantment` (category `enchantments`)
| Field | Type | R/O | Notes |
|---|---|---|---|
| `appliesTo` | `('melee' \| 'ranged' \| 'armor')[]` | R | |
| `tier` | `'common' \| 'powerful'` | O | From the "Cost" column. Absent when the wiki lists the cost as Unknown (three built-in exclusives, e.g. Shadow Shot); those entities are `partial` (D-041) |
| `isGilded` | `boolean` | R | Gilded variants are separate entities only if the wiki lists them separately; otherwise use `gildedDescription` |
| `gildedDescription` | `string` | O | |
| `levels` | `{ level: 1 \| 2 \| 3; text: string; value?: number; unit?: string }[]` | R | Tier I–III effect text, plus a parsed number where it exists |
| `pointCost` | `[number, number, number]` | O | Per-level costs, read from the page's Overview table: Common `[1,2,3]`, Powerful `[2,3,4]`. Absent together with `tier`. The wiki lists gilded variants in a description column, not separately, so `isGilded` is `false` and Gilded costs (`[2,3,4]` / `[3,4,5]`) are not stored (D-041) |
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
Dungeons II list pages are plain wikitables; the item, enchantment, mob and location pages carry a small `{{Infobox Dungeons II …}}` (flavor `description`, `variant`, mob `health`, location `subarea`/`station`). Rarity enum: `common | rare | special | unique`. **Finalized in Prompt 05 against the live pages (revisions in the coverage report); logged as D-051…D-061.**

Weapons and armor come in **pairs**: a base item (rarity cell "COMMON / RARE / SPECIAL") immediately followed by its unique variant (rarity "UNIQUE"). As in D1, the base gets `rarity: common` (its lowest tier, D-040) and the pair is linked with `baseItemId` / `variantIds`.

### 4.1 `D2Weapon`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `kind` | `'melee' \| 'ranged'` | R | |
| `weaponType` | `string` *(open)* | R | Melee: a family derived from the **base** item's name with a keyword table (`axe`, `hammer`, `sickle`, `dagger`, `sword`, `spear`; any other base is its own family, e.g. `claymore`, `glaive`); its unique variant shares it (D-052). Ranged: `bow \| crossbow` from the page section |
| `isUnique` | `boolean` | R | |
| `baseItemId` | `string` | O | Unique variants: the base item |
| `variantIds` | `string[]` | R | Base items: their unique variant (may be empty) |
| `effect` | `string` | O | "Effect" column; absent for the "None" of base items (they roll a random effect in game) |
| `effectNote` | `string` | O | The wiki's editorial "(Although unstated, …)" remarks after the effect |
| `effectValues` | `{ label: string; value: number; unit: '%' \| 's' \| 'flat' }[]` | R | Numbers parsed from `effect` (may be empty) |
| `comboLength` | `number` | O | Melee; "?" and blank mean unknown |
| `ammo` | `number` | O | Ranged: the "Ammo" column is the maximum arrow count (D-053; D1's `ammo` is text) |
| `locations` | `string[]` | R | "Drop location": location ids, quest ids ("(quest reward)") or raw text |
| `obtainable` | `boolean` | R | `false` for the "Unobtainable" table. These are **shown**, with a badge, and hidden by default through a filter |

### 4.2 `D2Armor`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `slot` | `'helmet' \| 'chestplate' \| 'leggings' \| 'boots'` | R | From the table's heading |
| `armorSet` | `string` | R | "Armor Set" column, display name (`Beekeeper Armor`); its slug is `slugify(armorSet)`. A base set and its unique set are separate sets (`Beekeeper Armor` / `Hivemind Armor`) |
| `isUnique`, `baseItemId`, `variantIds` | as D2Weapon | | A base piece and its unique piece (`Beekeeper Veil` ↔ `Hivemind Hardhat`) |
| `effects` | `string[]` | R | Lines of the "Effects" column ("None" dropped) |
| `effectValues` | as above | R | |
| `locations` | `string[]` | R | Ids or raw text |

### 4.3 `D2Enchantment`
The D2 list has no tier/cost/gilded/stackable/mob columns. Fields:
| Field | Type | R/O | Notes |
|---|---|---|---|
| `appliesTo` | `('melee' \| 'ranged' \| 'armor')[]` | R | "Applied to": Melee Weapon / Ranged Weapon / Armor |
| `restriction` | `string` | O | "(chestplate exclusive)" → `chestplate exclusive` |
| `levels` | `{ level: 1\|2\|3; text: string; value?: number; unit?: string }[]` | R | Tier I–III text; `value` only when the text holds exactly one number (`%` or `s` as unit) |
| `obtaining` | `string[]` | R | "Obtaining" column: quest ids / raw text; "?" (unknown) is dropped, so most are empty |

The wiki says each enchantable item holds **one** enchantment, which can be upgraded to tier III (two upgrades).

### 4.4 `D2Artifact`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `soulCost` | `number` | R | "Soul cost" |
| `requiresSouls` | `boolean` | R | `soulCost > 0` |
| `cooldownSeconds` | `number` | O | "Cooldown" (seconds) |
| `locations` | `string[]` | R | "Obtainable location" (ids or raw text) |

The wiki gives no artifact types (one table) and no property bullets, so there is no `artifactType` or `properties`; `description` is the in-game text and `tags` come from the keyword vocabulary (D-056). The "DLC exclusive" column sets `dlc` (free text).

### 4.5 `D2Talisman`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `passiveBonus` | `string` | R | |
| `boostType` | `'ranged' \| 'movement' \| 'drops' \| 'artifact' \| 'melee' \| 'health' \| 'pet' \| 'damage' \| 'souls' \| 'experience'` | R | Exactly the ten values the wiki uses |
| `isSecret` | `boolean` | R | "Secret" ✔ |
| `tiers` | `[{tier:1;text:string;value?:number;unit?:string},{tier:2;…},{tier:3;…}]` | R | T1–T3 (bronze/silver/gold frames). `text` keeps the raw cell ("10%", "25%/7000", "10% while health is above 95%", "N/A"); `value` is its leading number and `unit` is `%` when it has one |
| `sourceType` | `'quest-reward' \| 'secret-chest' \| 'boss-drop' \| 'other'` | R | From the first source line ("Reward from…", "Secret Chest in…", "Dropped by…") |
| `locations` | `string[]` | R | Every source: quest ids, location ids or raw text |

### 4.6 `D2Quest`
| Field | Type | R/O | Notes |
|---|---|---|---|
| `questType` | `'core' \| 'side'` | R | Unused quests are **excluded** |
| `order` | `number` | O | Core quest order = table order |
| `locationIds` | `string[]` | R | "Location(s)" column; a station or sub-area name resolves to the main location that lists it, when exactly one does |
| `areas` | `string[]` | R | Names from "Location(s)" that are not a main location (stations, sub-areas such as `The Deep Dark`) |
| `rewards` | `{ when: 'first' \| 'subsequent' \| 'always'; xp?: number; items: string[]; randomFrom?: { text: string; count: number; from: string[] }[] }[]` | R | One entry per "First completion" / "Subsequent completions" block, or a single `always` entry. `items` are ids or raw text. Each "Random gear from X", "2 random pieces of Y Armor", "Random artifact between: …" line is one `randomFrom` entry: `text` verbatim, `count` the number drawn (default 1), `from` the pool as ids / raw text (D-055) |
| `dlcExclusive` | `boolean` | R | "Is DLC exclusive" |

### 4.7 `D2Mob`
Same shape as `D1Mob`; `mobType` *(open)*: `boss`, `mini-boss`, `hazard`, `merchant`, `character`, `companion`, `pet`, `non-attackable`, `common`, `passive` (D-058). `health` is the infobox text (tiers and soul-corrupted values) when it has a number. `attacks` come from the Behavior sub-headings when the page has them (usually none); `drops` from a Drops list.

### 4.8 `D2Location`
`D1Location` fields (`region`, `mobIds`, `itemIds`) plus: `locationType` *(open)*: `overworld`, `sift`, `rift`; `region` = the list's heading; `stations: string[]` and `subAreas: string[]` (text: minecart stations and sub-areas); `questIds: string[]` (**computed** from quests whose `locationIds` include this location). `secretOf` and `recommendedPower` do not exist for D2 (D-059).

## 5. Cross-reference rules (`npm run data:validate` enforces them)
- Every id in `related`, `baseItemId`, `variantIds`, `builtInEnchantments[].enchantmentId`, `builtInto`, `locationIds`, `mobIds`, `itemIds`, `secretOf` and `dlc` (D1 only; D2 `dlc` is free text) must resolve to an existing entity in the **same game**. Values in `locations`/`drops` (and D2 quest `rewards[].items`/`randomFrom`, which are also "ids or text") may be raw text **only if** they're listed in the coverage report under an "Unresolved references" heading, one bullet each, value in backticks: ``- `Gift Wrapper` — used by d1:weapons:claymore`` (D-037).
- Every `image.src` must exist on disk.
- `id` values are unique across the game; slugs are unique within a category.
- Generated JSON is sorted by `name` (case-insensitive) for stable diffs, using `compareByName` from `scripts/lib/data-files.ts` (ties: exact name, then id).

## 6. `EntityListItem` projection
For each category, `src/config/categories.ts` declares `listFields` (the fields needed by its cards, table columns and filters). The loader `getListItems(game, category)` returns `Pick<Entity, 'id'|'slug'|'name'|'image'|'rarity'|'dlc'|'tags'|'quality'> & listFields`.
