import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, DISCLAIMER, absoluteUrl, normalizeSiteUrl } from '@/lib/site';

describe('site helpers', () => {
  it('normalizes the site URL to an origin', () => {
    expect(normalizeSiteUrl('https://dungeons-codex.vercel.app/')).toBe(
      'https://dungeons-codex.vercel.app',
    );
    expect(normalizeSiteUrl(' https://example.com/some/path?x=1 ')).toBe('https://example.com');
  });

  it('falls back to localhost for missing, invalid or non-http values', () => {
    expect(normalizeSiteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl('')).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl('not a url')).toBe(DEFAULT_SITE_URL);
    expect(normalizeSiteUrl('javascript:alert(1)')).toBe(DEFAULT_SITE_URL);
  });

  it('builds absolute URLs', () => {
    expect(absoluteUrl('/d1', 'https://x.test')).toBe('https://x.test/d1');
    expect(absoluteUrl('d1', 'https://x.test')).toBe('https://x.test/d1');
  });

  it('carries the exact legal disclaimer from Plans 09', () => {
    expect(DISCLAIMER).toBe(
      'Dungeons Codex is an unofficial fan site. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Game data and images from the Minecraft Wiki (minecraft.wiki), licensed CC BY-NC-SA 3.0.',
    );
  });
});
