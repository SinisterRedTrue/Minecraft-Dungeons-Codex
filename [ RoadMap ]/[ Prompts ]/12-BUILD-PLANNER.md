# Prompt 12: Build Planner

**Follow `00-PROMPT-PROTOCOL.md`.** Depends on: 11.
**Read first:** `[ Plans ]/07-FEATURES-SPEC.md` §5 (with the D2 slot facts Prompt 05 recorded), §2 (Forge math reuse); `[ Design ]/Wireframes/WIREFRAMES.md` §6.

## Goal
A shareable loadout builder for both games: pick gear per slot with enchantments and tiers, see a live summary, and share it by URL or save it locally.

## Tasks
1. **Model** `src/lib/planner/`: `slots.ts` (D1 and D2 slot definitions exactly as in 07 §5: key, label, category, filter preset such as D2 `slot=helmet`, whether it takes enchantments); `schema.ts` (Zod Build v1); `codec.ts` (JSON → fflate deflate when that's shorter → base64url; a 1-char prefix marks raw vs deflated; decode validates and drops unknown slugs while reporting them); `summary.ts` (total points, grouped effects summing the same label and unit, damage at build power through `src/lib/forge`, duplicate-artifact warning). **100 % branch coverage**; a test asserts a fully loaded build URL stays ≤ 2,000 chars.
2. **Page** `app/[game]/planner/page.tsx`: static shell; the client `BuildPlanner` reads `?b=` (nuqs, replace history). It needs the entity data for each slot category: reuse the compare JSON from Prompt 11 (extend it with the fields the planner needs, e.g. effects and enchantment `appliesTo`), and log it.
3. **UI:** a gear grid with `PlannerSlot` cards (empty state "+ Choose"; a filled one shows the frame, name and enchantment chips with tiers). Clicking opens the **ItemPicker** Sheet (desktop: a large Dialog), which reuses `TypeSelector` + `FilterPanel` + the EntityCard grid scoped to the slot's category and preset. An `EnchantPicker` handles each gear slot (scoped by `appliesTo`, tier I/II/III, built-ins locked). Build name (inline edit), power input (D1). A **Summary** Panel (points with the gem icon, approximate damage with the badge, grouped effects with the "simple sum" note, warnings). Actions: Copy link (toast), Save to My builds (localStorage `dc:builds:v1`, max 50, with name and date), Duplicate, Clear (with a confirm dialog), Open item (new tab).
4. **"Open in Planner"** buttons on detail pages put the item into the right slot of the current game's draft build (`dc:planner-draft:{game}`) and navigate to the planner.
5. **My builds** list: rename, delete (confirm), open, copy link.
6. **Tests:** model units; component tests (picker scoping, enchant scoping, duplicate warning, invalid-URL toast); e2e `planner.spec.ts` (from 08) for D1 **and** a D2 variant with armor slots; axe on the planner with the picker open.

## Mini-checklist
- [ ] Slot definitions for D1 and D2 match 07 §5 exactly
- [ ] Codec (deflate + base64url, validated, ≤ 2,000 chars), 100 % branches
- [ ] Summary math (points, grouped effects, damage via Forge, warnings)
- [ ] Planner UI: slots, ItemPicker reusing filters, EnchantPicker, name, power, summary, actions
- [ ] Open in Planner from detail pages
- [ ] My builds (save, rename, delete, open, copy)
- [ ] D1 + D2 planner e2e + component tests + axe pass
- [ ] Visual check in both themes at 1440/390 against Wireframe §6

## Acceptance
```bash
npm run verify
```
```bash
npm run e2e
```

## Commit
`feat(planner): shareable Build Planner for Dungeons I and II`
