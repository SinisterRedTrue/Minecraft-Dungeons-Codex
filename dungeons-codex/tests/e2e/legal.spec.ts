import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// Prompt 13, task 8 (Plans 09): footer text exact on every kind of page, both licences present,
// nothing commercial or tracking, no official logos. (SourceCredit on every detail page is
// asserted by the 16-category sweep in detail.spec.ts; /about's sections by shell.spec.ts.)

const DISCLAIMER =
  'Dungeons Codex is an unofficial fan site. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Game data and images from the Minecraft Wiki (minecraft.wiki), licensed CC BY-NC-SA 3.0.';

const PAGES = [
  '/',
  '/d1',
  '/d2',
  '/d1/weapons',
  '/d2/quests',
  '/d1/weapons/claymore',
  '/d1/compare',
  '/d2/planner',
  '/favorites',
  '/about',
  '/no-such-page',
];

test.describe('footer', () => {
  for (const url of PAGES) {
    test(`${url} carries the exact disclaimer and the data line`, async ({ page }) => {
      await page.goto(url);
      const footer = page.getByRole('contentinfo');
      const text = (await footer.innerText()).replace(/\s+/g, ' ');
      expect(text).toContain(DISCLAIMER);
      expect(text).toMatch(
        /Data © Minecraft Wiki contributors · CC BY-NC-SA 3\.0 · Last synced \d{4}-\d{2}-\d{2}/,
      );
    });
  }
});

test.describe('licences and assets', () => {
  const root = process.cwd();

  test('code licence (MIT) and data licence (CC BY-NC-SA 3.0) files exist and say so', () => {
    expect(readFileSync(path.join(root, 'LICENSE'), 'utf8')).toMatch(/MIT License/i);
    const data = readFileSync(path.join(root, 'data', 'LICENSE.md'), 'utf8');
    expect(data).toMatch(/CC BY-NC-SA 3\.0|Attribution-NonCommercial-ShareAlike 3\.0/i);
    expect(existsSync(path.join(root, 'README.md'))).toBe(true);
  });

  test('no official Minecraft or Minecraft Dungeons logo is shipped', () => {
    const names = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? names(path.join(dir, entry.name)) : [entry.name.toLowerCase()],
      );
    const brand = names(path.join(root, 'public', 'brand')).filter((n) => n !== '.gitkeep');
    expect(brand.sort()).toEqual(['logo.svg', 'og-default.png']);
    // Entity icons are data; nothing named like a logo or key art anywhere in public/.
    const all = names(path.join(root, 'public'));
    expect(
      all.filter((n) => /(^|[-_])(logo|key-?art|logotype)([-_.]|$)/.test(n) && n !== 'logo.svg'),
    ).toEqual([]);
  });
});

test.describe('no monetization, no trackers', () => {
  for (const url of ['/', '/d1/weapons/claymore', '/about']) {
    test(`${url} loads nothing from an ad, analytics or payment origin`, async ({ page }) => {
      const origins = new Set<string>();
      page.on('request', (request) => origins.add(new URL(request.url()).hostname));
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const external = [...origins].filter((host) => host !== 'localhost');
      expect(external, `external origins on ${url}`).toEqual([]);
      const html = await page.content();
      expect(html).not.toMatch(
        /googletagmanager|google-analytics|adsbygoogle|doubleclick|paypal\.me|patreon\.com|ko-fi\.com|buymeacoffee|plausible\.io|hotjar|facebook\.net|affiliate/i,
      );
      expect(await page.context().cookies()).toEqual([]);
    });
  }
});
