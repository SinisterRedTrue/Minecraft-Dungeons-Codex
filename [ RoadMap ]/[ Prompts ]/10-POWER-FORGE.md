# Prompt 10: Power Forge (stat simulator)

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 09.
**Read first:** `[ Plans ]/07-FEATURES-SPEC.md` §2 (all of it), `04-DATA-PIPELINE.md` "Power Forge data"; `[ Design ]/Wireframes/WIREFRAMES.md` §4 (the Forge panel).

## Goal
On weapon and armor detail pages, users adjust power level and enchantments (with tiers) and see the stats update live. The numbers are honest: exact where the data is documented, badged Approximate everywhere else. Enchantment and talisman pages get a tier viewer.

## Tasks
1. **Math** `src/lib/forge/`:
   - `interpolate.ts`: log-linear interpolation between neighboring `powerTable` points (separately for min and max). It must return the documented points **exactly** at documented powers.
   - `curves.ts`: load `data/forge/{game}/curves.json`; `multiplierAt(curve, power)` (log-linear between curve points; extrapolates at the ends with the last segment's slope, flagged approximate).
   - `damage.ts`: `damageAt(item, power) → { min, max, approximate: boolean, reason?: 'off-table' | 'curve' | 'baseline' }`, implementing the 3 cases in 07 §2.
   - `enchantments.ts`: `applyEnchantments(base, picks, catalog) → { min, max, lines: [{ name, tier, text, value?, conditional: boolean }] }`. Only numeric, unconditional damage percentages are applied multiplicatively. Conditional effects (detected by keywords like "undead", "when", "while", "chance", "below", "after") are listed separately.
   - `points.ts`: the enchantment point total from `pointCost`.
   - `codec.ts`: `?forge=` encode/decode (base64url JSON `{p, e:[[slug,tier],…]}`, Zod-validated).
   - **100 % branch coverage**; tests use the real Claymore `powerTable` points plus 2 other items that have tables.
2. **UI** `src/components/features/forge/`: `PowerForge` (client) per 07 §2 and the wireframe: power Slider (D1 1–263 with tick marks at 250/256/263) synced to a number input; 3 enchantment slots (combobox scoped to enchantments that apply to the item kind; tier ToggleGroup I/II/III); built-ins prefilled and locked; points counter (pixel font + gem); result panel with animated number tickers (off under reduced motion); an Approximate badge with a tooltip giving the reason; Reset; Share (copies the URL, toast).
   - D1 armor: damage reduction, health and effects (static), plus enchantment tier lines.
   - D2 weapons/armor: no power slider. Enchantment/effect tier lines only, plus the honest note text from 07 §2.
   - Enchantment detail pages: `TierViewer` (I/II/III toggle showing the effect text and value, point cost and cumulative cost).
   - D2 talisman pages: `TierViewer` for T1–T3.
3. Mount it in `<ForgeSlot />` according to category config (`detailSections` includes `'forge'` or `'tiers'`).
4. **Performance:** the Forge chunk loads only on detail pages (`next/dynamic` with a skeleton). Slider input → result update in < 16 ms (memoized).
5. **Tests:** math units; component tests (slider keyboard, adding an enchantment raises damage, a conditional enchantment doesn't change the main number, a locked built-in can't be removed, the share URL round-trips); e2e `forge.spec.ts` (from 08). Item fixtures: one with a table (exact), one without (Approximate).

## Mini-checklist
- [x] interpolate / curves / damage / enchantments / points / codec, 100 % branches
- [x] Documented power points reproduced exactly
- [x] PowerForge UI for D1 weapons, D1 armor, D2 weapons/armor (honest D2 note)
- [x] TierViewer on enchantment + talisman pages
- [x] Approximate badge + reason tooltip everywhere a value is computed
- [x] Share link round-trips; Reset works
- [x] Lazy-loaded; < 16 ms updates
- [x] forge e2e + component tests + axe on a forge page
- [x] Visual check in both themes at 1440/390 against the wireframe

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(forge): Power Forge stat simulator and tier viewers`
