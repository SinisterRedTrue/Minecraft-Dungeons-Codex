/**
 * True when `a` and `b` are at most one edit apart: one substitution, insertion, deletion or
 * swap of two neighbouring letters (the usual typing slips). O(length), no matrix.
 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    // Substitution, or a swap of the letters at i and i + 1.
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  // Insertion / deletion: drop one letter from the longer string.
  return la > lb ? a.slice(i + 1) === b.slice(i) : b.slice(i + 1) === a.slice(i);
}

/** Shortest query token that may contain a typo; below it a one-letter slip is too ambiguous. */
export const MIN_TYPO_LENGTH = 4;

/**
 * Does the query token `token` match `word` as a prefix with at most one typo? Tries the whole
 * word and the word cut to the token's length ±1, so "claymroe", "clymore" and "claymoer" all
 * reach "claymore".
 */
export function fuzzyPrefixMatch(token: string, word: string): boolean {
  if (token.length < MIN_TYPO_LENGTH) return false;
  return (
    withinOneEdit(token, word) ||
    withinOneEdit(token, word.slice(0, token.length)) ||
    withinOneEdit(token, word.slice(0, token.length + 1)) ||
    withinOneEdit(token, word.slice(0, token.length - 1))
  );
}
