/**
 * Raw colour literals in source text: hex (#abc, #aabbcc, with alpha) and rgb()/hsl()/oklch()
 * functions. Plans 08: colours come from the design tokens, so `src/` outside `src/styles/` has none.
 */

// `(?<![\w&])` keeps HTML entities (`&#x27;`), anchors in URLs and identifiers like `a#b1` out.
const HEX = /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
const FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/g;

export type RawColor = { line: number; text: string };

export function findRawColors(source: string): RawColor[] {
  const found: RawColor[] = [];
  source.split(/\r?\n/).forEach((text, index) => {
    for (const pattern of [HEX, FUNCTION]) {
      pattern.lastIndex = 0;
      if (pattern.test(text)) found.push({ line: index + 1, text: text.trim() });
    }
  });
  return found;
}
