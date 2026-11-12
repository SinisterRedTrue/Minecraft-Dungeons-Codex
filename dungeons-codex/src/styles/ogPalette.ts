/**
 * Colours of the generated Open Graph cards. `next/og` (satori) renders to an image and cannot
 * read CSS variables, so the dark-theme token values live here, in `styles/` with the other raw
 * colours. `tests/unit/styles/ogPalette.test.ts` fails when one drifts from `tokens.css`.
 */
export const OG_PALETTE = {
  rarity: {
    common: '#b8b8b8',
    rare: '#45b5ff',
    special: '#c07bff',
    unique: '#ff9f1c',
  } as Record<string, string>,
  /** `--bg` and a warm lift of it for the top corner of the gradient. */
  bg: '#0f0d0b',
  bgGlow: '#1a1206',
  /** Slot background behind the icon. */
  slot: '#17120d',
  text: '#f4ebdd',
  textMuted: '#cdbfa6',
  /** `--emerald`, the wordmark colour. */
  brand: '#3bd16f',
} as const;
