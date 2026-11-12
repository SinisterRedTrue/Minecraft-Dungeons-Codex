/**
 * Text normalisation shared by the index build, the engine and the tests: lower case, accents
 * stripped, apostrophes dropped (so "Hunter's" and "hunters" are the same word) and every other
 * run of punctuation turned into a single space. Digits are kept.
 */
export function normalize(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’‘`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(' ') : [];
}
