/**
 * URL-safe slug: lower-case, accents folded to ASCII, apostrophes dropped (so "Axe's" is not
 * "axe-s"), "&" spelled out as "and", every other run of non-alphanumerics a single hyphen.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u201B\u02BC'`]/g, '')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
