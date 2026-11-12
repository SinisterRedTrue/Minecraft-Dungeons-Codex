import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OG_PALETTE } from '@/styles/ogPalette';

const tokens = readFileSync(path.join(process.cwd(), 'src', 'styles', 'tokens.css'), 'utf8');

/** First declaration of a custom property (the dark theme, which is `:root`'s default). */
function token(name: string): string {
  const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(tokens);
  if (!match) throw new Error(`token ${name} not found`);
  return (match[1] as string).toLowerCase();
}

describe('OG palette', () => {
  it('matches the dark-theme tokens it mirrors', () => {
    expect(OG_PALETTE.rarity.common).toBe(token('--rarity-common'));
    expect(OG_PALETTE.rarity.rare).toBe(token('--rarity-rare'));
    expect(OG_PALETTE.rarity.special).toBe(token('--rarity-special'));
    expect(OG_PALETTE.rarity.unique).toBe(token('--rarity-unique'));
    expect(OG_PALETTE.bg).toBe(token('--bg'));
    expect(OG_PALETTE.text).toBe(token('--text'));
    expect(OG_PALETTE.brand).toBe(token('--emerald'));
  });
});
