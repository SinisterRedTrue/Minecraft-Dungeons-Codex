# 06: Filters Spec

## How filtering works
- **Step 1, Type selector:** a large segmented chip row with the category's primary dimension. It's always visible above the results. Some categories have a **second chip row** that appears once a first-level chip is chosen (e.g. Weapons → *Melee* → `Sword · Daggers · Claymore · …`).
- **Step 2, Filter panel:** the filters for that category. Filters that only apply to one type show only when that type is selected (the `showWhen` rule).
- All state lives in the URL (via nuqs), so every view can be shared. Param names are short and stable, e.g. `/d1/weapons?t=melee&wt=daggers&dmg=10-40&p=dual-wield,spin-attack&u=1&sort=dmg-desc&view=table`.
- Unknown or invalid params are ignored quietly; they never crash the page.
- Facet counts: each option shows how many results it *would* give with the other active filters applied. A disabled option (0 results) stays visible but muted.

## FilterDef types (`src/lib/filters/types.ts`)
```ts
type FilterDef =
  | { kind: 'type';   key: string; param: string; label: string; field: string; options: 'auto' | Option[]; level: 1 | 2; showWhen?: Cond }
  | { kind: 'range';  key: string; param: string; label: string; field: string; unit?: string; step: number; showWhen?: Cond }   // bounds auto from data
  | { kind: 'multi';  key: string; param: string; label: string; field: string; match: 'any' | 'all'; options: 'auto' | Option[]; showWhen?: Cond; searchable?: boolean }
  | { kind: 'toggle'; key: string; param: string; label: string; field: string; value: unknown; showWhen?: Cond }
  | { kind: 'text';   key: 'q'; param: 'q'; label: 'Search in results'; fields: string[] }
type Cond = { param: string; equals: string | string[] }
type SortDef = { param: 'sort'; options: { value: string; label: string; field: string; dir: 'asc' | 'desc' }[]; default: string }
```
`field` is a dot-path into `EntityListItem` (e.g. `stats.damage`, `effects[label=Movement Speed].value` with a tiny path DSL that supports only `a.b` and `arr[key=value].prop`; that DSL is unit-tested).
Every category also gets **`q` text search** (name + properties) and **sort by Name A–Z / Z–A** automatically.
**Range bounds** are computed from the data (min/max of the field). Items **missing** the field are kept when the range is at its full bounds and excluded once the user narrows it. The panel says "n items without this stat are hidden".

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

### D2 · Enchantments / Artifacts / Mobs / Locations
Mirror the D1 definitions using the D2 fields. Prompt 05 finalizes the option lists from the data.

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
