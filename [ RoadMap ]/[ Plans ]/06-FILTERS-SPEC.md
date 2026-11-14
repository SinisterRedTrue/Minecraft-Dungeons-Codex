# 06: Filters Spec

## How filtering works
- **Cards first, filters on request** (D-111). A category page opens as full-width cards with their key stats, **best and rarest first** (see *Default order*). Above them sits one **simple bar**: the level 1 type chips (Melee / Ranged, Base / Unique, Slot, ...), the `quick` toggles (Unique only), the in-results search and an **Advanced filters** button.
- **Advanced filters** (button on desktop, "Advanced" bottom sheet on phones) reveal the full panel: the level 2 type rows (Weapon type under Melee/Ranged, which still appears once a level 1 chip is chosen, e.g. Weapons → *Melee* → `Sword · Daggers · Claymore · …`), then every range, multi and toggle filter for the category. Filters that only apply to one type show only when that type is selected (the `showWhen` rule). The panel starts closed, unless the URL already uses an advanced filter (a shared link opens it); the button shows how many advanced filters are set.
- A def is in the simple bar when it is a level 1 type or a toggle with `quick: true`; everything else is advanced. Quick filters are not repeated in the panel. Small lists (D1 DLCs) have no filters at all.
- All state lives in the URL (via nuqs), so every view can be shared. Param names are short and stable, e.g. `/d1/weapons?t=melee&wt=daggers&dmg=10-40&p=dual-wield,spin-attack&u=1&sort=dmg-desc&view=table`.
- Unknown or invalid params are ignored quietly; they never crash the page.
- Facet counts: each option shows how many results it *would* give with the other active filters applied. A disabled option (0 results) stays visible but muted. Level 1 counts ignore the level 2 selection (Daggers must not zero out Ranged); an `all` multi keeps its own selection, an `any` multi and a type ignore theirs.
- **Default order** (D-111): categories with a rarity (weapons and armor in both games, D1 artifacts) sort `rarity-desc` (Unique, Special, Rare, Common), then by the category's key stat, best first: D1 weapons damage then speed, armor damage reduction, D2 weapons primary effect, D1 artifacts shortest cooldown. A `SortOption` may carry `then` keys for this; the name is the last tiebreak. Every other category keeps its earlier order (A to Z, story order, release order) because it has no clear "best". The sort menu still offers every other order.
- A level 2 type with a `showWhen` (Weapon type under Melee/Ranged) lists only the options that give results, most frequent first. One without (D1 armor group, D2 armor set, D1 enchantment tier) is always shown. Setting a level 1 type clears every level 2 type. More than 30 options become a searchable picker instead of chips.
- A filter the data cannot support is hidden, not shown dead (a toggle nothing matches, a range with no values, a multi without options).
- History: chips, checkboxes, toggles and sorting `push` (so Back steps through them); slider drags, typing in the search box and the grid/table switch `replace`.
- `q` searches the name and the property tags (hyphens read as spaces, apostrophes ignored).

## FilterDef types (`src/lib/filters/types.ts`)
```ts
type FilterDef =
  | { kind: 'type';   key; param; label; field; options: 'auto' | Option[]; level: 1 | 2; order?: string[]; showWhen?: Cond }
  | { kind: 'range';  key; param; label; field; unit?; step; dependsOn?: string; showWhen?: Cond }   // bounds auto from data
  | { kind: 'multi';  key; param; label; field; match: 'any' | 'all'; options: 'auto' | Option[]; order?: string[]; noneOption?: Option; searchable?: boolean; showWhen?: Cond }
  | { kind: 'toggle'; key; param; label; field; value: unknown; hiddenUntilOn?: boolean; showWhen?: Cond }
  | { kind: 'text';   key: 'q'; param: 'q'; label: 'Search in results'; fields: string[] }
type Cond = { param: string; equals: string | string[] }
type SortDef = { param: 'sort'; options: { value; label; field; dir: 'asc' | 'desc'; rank?: string[] }[]; default: string }
```
`field` is a dot-path into `EntityListItem` with a tiny DSL that supports only `a.b` and `arr[key=value].prop` (arrays are flattened); the DSL is unit-tested.

**How values are compared (D-068).** Every value is compared as a *token*: an entity id becomes its slug (`d1:locations:creeper-woods` → `creeper-woods`), text is slugified (`Movement Speed` → `movement-speed`), numbers and booleans are their text. State, URLs and `[key=value]` filters all use tokens, so URLs read like `?loc=creeper-woods,pumpkin-pastures` and never need escaping. Labels come from the data (`LabelMap` for entity names, the value itself for wiki text, a humanised slug otherwise).

**Derived list fields (D-069).** Values the spec marks "derived" are computed once at build time by `getListItems` (`src/lib/filters/derive.ts`) instead of growing the DSL: `totalCost` (sum of `pointCost`), `hasGilded`, `hasDrops`, D2 `primaryEffect` (first `%` effect value), D2 armor `damageReduction` (first "Take less damage" / "Reduces damage taken" effect), D2 `tierIIIValue`, D2 quest `maxXp` and `rewardItems`.

**Extensions the final config needs** (all optional, all unit-tested): `order` (token order for `auto` options), `noneOption` ("Base game" = no DLC), `dependsOn` + `{value}` (D1 armor "Effect strength" reads the chosen effect), `hiddenUntilOn` (D2 "Show unobtainable").

## Per-category definitions

### D1 · Weapons
| Level | Filter | Kind | Field | Notes |
|---|---|---|---|---|
| Type 1 | Melee / Ranged | type | `kind` | |
| Type 2 | Weapon type | type | `weaponType` | Options depend on kind (Sword, Daggers, Claymore, Glaive, … / Bow, Crossbow, …) |
| | Damage | range | `stats.damage` | step 0.5 |
| | Attack speed | range | `stats.speed` | step 0.05 (label taken from the stat mapping) |
| | Properties | multi (all) | `tags` | e.g. Dual wield, Long reach, Spin attack, Fast thrusts, Charged shots; searchable |
| | Rarity | multi (any) | `rarity` | Common, Rare, Unique |
| | Unique only | toggle | `isUnique` | |
| | Built-in enchantment | multi (any) | `builtInEnchantments.enchantmentId` | searchable |
| | Accepts soul enchantments | toggle | `acceptsSoulEnchantments` | |
| | DLC | multi (any) | `dlc` | "Base game" option = no DLC |
| | Seasonal | toggle | `isSeasonal` | |
| | Combo length | range | `comboLength` | showWhen t=melee |
| | Location | multi (any) | `locations` | searchable |
| Sort | Name, Damage ↑↓, Speed ↑↓, Rarity | | | |

### D1 · Armor
| Level | Filter | Kind | Field |
|---|---|---|---|
| Type 1 | Base / Unique | type | `isUnique` |
| Type 2 | Armor group | type | `armorGroup` |
| | Damage reduction % | range | `damageReduction` |
| | Effect | multi (all) | `effects.label` (e.g. Movement Speed, Cooldown Reduction, Life Steal, Souls Gathered, Melee Damage, Ranged Damage, Potion Cooldown, Weapon Damage Boost) |
| | Effect strength | range | the value of the chosen effect (only shows when exactly one Effect is selected) |
| | Built-in enchantment, Soul enchantments, DLC, Seasonal, Location, Rarity | as for weapons | |
| Sort | Name, Damage reduction ↑↓, Rarity | | |

### D1 · Enchantments
| Type 1 | Applies to: Melee / Ranged / Armor | type | `appliesTo` |
|---|---|---|---|
| Type 2 | Common / Powerful | type | `tier` |
| | Section (Standard / Exclusive / Mob-exclusive) | multi | `section` |
| | Stackable | toggle | `stackable` |
| | Mob-obtainable | toggle | `mobObtainable` |
| | Has gilded effect | toggle | `gildedDescription` exists |
| | Total point cost | range | `sum(pointCost)` (a derived list field) |
| Sort | Name, Total cost | | |

### D1 · Artifacts
| Type 1 | Damaging / Status / Quiver / Summoning / Agility / Defensive | type | `artifactType` |
|---|---|---|---|
| | Cooldown (s) | range | `cooldownSeconds` |
| | Requires souls | toggle | `requiresSouls` |
| | DLC, Location | multi | |
| Sort | Name, Cooldown ↑↓ | | |

### D1 · DLCs
| Type 1 | (none; small list, cards in release order) |
|---|---|
| Sort | Release order (default), Name |

### D1 · Cosmetics
| Type 1 | Cape / Pet / Emote / Flare / Skin | type | `cosmeticType` |
|---|---|---|---|
| | Obtained from | multi | `obtainedFrom` |
| | DLC | multi | `dlc` |
| | Season | multi | `season` |

### D1 · Mobs
| Type 1 | Mob type (Common, Ancient, Boss, …) | type | `mobType` |
|---|---|---|---|
| | Location | multi | `locationIds` |
| | DLC | multi | `dlc` |
| | Has drops | toggle | `drops.length > 0` (derived) |

### D1 · Locations
| Type 1 | Mission / Secret / DLC mission / Tower / Camp / Other | type | `locationType` |
|---|---|---|---|
| | Region | multi | `region` |
| | DLC | multi | `dlc` |
| | Contains mob | multi (any) | `mobIds`; searchable |

*Cards show no "recommended power": the field is empty for every synced location (D-074).*

### D2 · Weapons
| Type 1 | Melee / Ranged | type | `kind` |
|---|---|---|---|
| Type 2 | Weapon type | type | `weaponType` |
| | Rarity | multi | `rarity` (Common, Rare, Special, Unique) |
| | Effect keyword | multi (all) | `tags` |
| | Effect strength % | range | `effectValues[0].value` (labeled "Primary effect %") |
| | Combo length | range | `comboLength`, showWhen t=melee |
| | Ammo | multi | `ammo`, showWhen t=ranged |
| | Location | multi | `locations` |
| | Show unobtainable | toggle | `obtainable=false` included (default **off**) |

### D2 · Armor
| Type 1 | Helmet / Chestplate / Leggings / Boots | type | `slot` |
|---|---|---|---|
| Type 2 | Armor set | type | `armorSet` (searchable chip overflow → combobox) |
| | Rarity | multi | `rarity` |
| | Damage reduction % | range | parsed `effectValues` where the label matches /damage/i and "less damage" |
| | Effect keyword | multi (all) | `tags` |
| | Location | multi | `locations` |
| Extra | "Group by set" view toggle | | Shows the 4 pieces of each set together in a row |

### D2 · Enchantments / Artifacts / Mobs / Locations (final, Prompt 07)
Mirror the D1 definitions where D2 has the field; D2 has no tiers, costs, gilded text or artifact types.
| Category | Filters |
|---|---|
| Enchantments | Type 1 *Applies to* (Melee / Ranged / Armor) · Effect keyword (`tags`, all) |
| Artifacts | Cooldown (s) · Soul cost · Effect keyword · Location · Sort: Name, Cooldown ↑↓, Soul cost ↑↓ |
| Mobs | Type 1 *Mob type* · Location (`locationIds`) · Has drops (hidden: no D2 mob lists drops) |
| Locations | Type 1 *Overworld / The Sift / The Rift* (`locationType`) · Contains mob (`mobIds`) |

### D2 · Talismans
| Type 1 | Boost type (Ranged, Movement, Drops, Artifact, Melee, Health, Pet, Damage, Souls, Experience) | type | `boostType` |
|---|---|---|---|
| | Secret | toggle | `isSecret` |
| | Source | multi | `sourceType` |
| | Tier III value | range | `tiers[2].value` |
| | Location | multi | `locations` |

### D2 · Quests
| Type 1 | Core / Side | type | `questType` |
|---|---|---|---|
| | Location | multi | `locationIds` |
| | XP reward | range | max `rewards[].xp` (derived) |
| | Rewards include item | multi (any) | `rewards[].items`; searchable |
| | DLC exclusive | toggle | `dlcExclusive` |
| Sort | Story order (core, default), Name, XP ↓ | | |

## Filter engine requirements
- Pure functions: `applyFilters(items, defs, state) → items`, `facetCounts(items, defs, state) → Record<key, Record<option, number>>`, `parseState(searchParams, defs)`, `serializeState(state, defs)`.
- 100 % branch coverage in unit tests for the engine and the path DSL.
- Performance: 1,000 synthetic items × 12 filters is under 10 ms per apply in the unit benchmark.
