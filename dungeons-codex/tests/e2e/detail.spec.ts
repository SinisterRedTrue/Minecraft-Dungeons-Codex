import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { seededPick } from '../../src/lib/utils/seed';
import { countOf, expectNoSeriousA11yViolations, hasHorizontalScroll } from './helpers';

type Entity = { slug: string; name: string; quality: string; [key: string]: unknown };

function load(game: 'd1' | 'd2', category: string): Entity[] {
  const file = path.join(process.cwd(), 'data', 'generated', game, `${category}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as Entity[];
}

const CATEGORIES = {
  d1: ['weapons', 'armor', 'enchantments', 'artifacts', 'dlcs', 'cosmetics', 'mobs', 'locations'],
  d2: ['weapons', 'armor', 'enchantments', 'artifacts', 'talismans', 'quests', 'mobs', 'locations'],
} as const;

test.describe('detail page anatomy', () => {
  test('a D1 weapon shows header, stats, infobox, source credit, related and prev/next', async ({
    page,
  }) => {
    await page.goto('/d1/weapons/claymore');
    await expect(page).toHaveTitle(/^Claymore · Weapons · Minecraft Dungeons \| Dungeons Codex$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Claymore');
    await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Weapons');

    const infobox = page.getByRole('region', { name: 'Infobox' });
    await expect(infobox.locator('dt', { hasText: /^Type$/ })).toBeVisible();
    await expect(infobox.getByRole('link', { name: /Minecraft Wiki/ })).toHaveAttribute(
      'href',
      /minecraft\.wiki/,
    );
    await expect(page.getByRole('meter', { name: 'Damage' })).toBeVisible();

    // The full credit names the page, the revision and the license.
    const credit = page.getByText(/^Data and image from/);
    await expect(credit).toContainText('Dungeons:Claymore');
    await expect(credit).toContainText(/revision \d+/);
    await expect(credit.getByRole('link', { name: 'CC BY-NC-SA 3.0' })).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Related', level: 2 })).toBeVisible();
    await expect(page.locator('#related article').first()).toBeVisible();

    const nav = page.getByRole('navigation', { name: 'Previous and next weapons' });
    await expect(nav.getByRole('link', { name: /Next:/ })).toBeVisible();
    // The favourite / compare / planner slot is laid out for Prompt 11, but empty.
    await expect(page.locator('[data-slot="detail-actions"]')).toBeEmpty();
  });

  test('metadata: canonical, description, Open Graph image and breadcrumb JSON-LD', async ({
    page,
    request,
  }) => {
    await page.goto('/d1/weapons/claymore');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/d1\/weapons\/claymore$/,
    );
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length).toBeGreaterThan(20);
    expect(description?.length).toBeLessThanOrEqual(155);
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(ogImage).toMatch(/\/d1\/weapons\/claymore\/opengraph-image/);
    const response = await request.get(new URL(ogImage ?? '', page.url()).pathname);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}',
    ) as { '@type': string; itemListElement: { name: string }[] };
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.at(-1)?.name).toBe('Claymore');
  });

  test('[ and ] move to the previous and next entry; typing is left alone', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'keyboard shortcuts');
    const all = load('d1', 'weapons');
    const second = all[1] as Entity;
    await page.goto(`/d1/weapons/${second.slug}`);
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press(']');
    await expect(page).toHaveURL(new RegExp(`/d1/weapons/${(all[2] as Entity).slug}$`));
    await page.keyboard.press('[');
    await expect(page).toHaveURL(new RegExp(`/d1/weapons/${second.slug}$`));
    await page.getByRole('button', { name: /Keyboard shortcuts/ }).hover();
    await expect(page.getByRole('tooltip')).toContainText('previous');
  });

  test('the first entry has no previous link and the last no next link', async ({ page }) => {
    const all = load('d1', 'armor');
    await page.goto(`/d1/armor/${(all[0] as Entity).slug}`);
    const nav = page.getByRole('navigation', { name: 'Previous and next armor' });
    await expect(nav.getByRole('link', { name: /Previous:/ })).toHaveCount(0);
    await page.goto(`/d1/armor/${(all.at(-1) as Entity).slug}`);
    await expect(nav.getByRole('link', { name: /Next:/ })).toHaveCount(0);
  });

  test('a DLC lists its contents and each item links back to the DLC', async ({ page }) => {
    await page.goto('/d1/dlcs/flames-of-the-nether');
    const weapons = page.locator('#contents-weapons');
    await expect(weapons.getByRole('heading', { name: /Weapons \(\d+\)/ })).toBeVisible();
    await weapons.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/d1\/weapons\//);
    await expect(
      page
        .getByRole('list', { name: 'Badges' })
        .getByRole('link', { name: 'Flames of the Nether' }),
    ).toBeVisible();
  });

  test('a location lists items found here and the item lists the location', async ({ page }) => {
    await page.goto('/d1/locations/creeper-woods');
    const items = page.locator('#items');
    await expect(items.getByRole('heading', { name: 'Items found here' })).toBeVisible();
    const link = items.getByRole('link').first();
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(
      page.locator('#where-to-find').getByRole('link', { name: 'Creeper Woods' }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.locator('#mobs').getByRole('link').first()).toBeVisible();
  });

  test('an enchantment shows its tier table, and a weapon links its built-in enchantments', async ({
    page,
  }) => {
    await page.goto('/d1/enchantments/sharpness');
    const table = page.getByRole('table', { name: /enchantment tier/i });
    await expect(table.getByRole('row')).toHaveCount(4);
    await expect(table.getByRole('columnheader', { name: 'Point cost' })).toBeVisible();
    await expect(page.locator('#built-into').getByRole('link').first()).toBeVisible();
    await page.goto('/d1/weapons/anchor');
    await expect(
      page.locator('#built-in-enchantments').getByRole('link', { name: /Gravity/ }),
    ).toBeVisible();
  });

  test('D2: armor set view, quest rewards and story order, talisman tiers', async ({ page }) => {
    await page.goto('/d2/armor/alchemist-loafers');
    const set = page.locator('#set');
    await expect(set.getByRole('heading', { name: /^Set:/ })).toBeVisible();
    await expect(set.locator('[aria-current="page"]')).toHaveCount(1);
    expect(await set.getByRole('link').count()).toBeGreaterThanOrEqual(1);

    await page.goto('/d2/quests/a-dip-in-ichor-springs');
    await expect(page.locator('#rewards')).toContainText('550');
    await expect(page.locator('#rewards details').first()).toBeVisible();

    const core = load('d2', 'quests').find((q) => q['order'] === 2) as Entity;
    await page.goto(`/d2/quests/${core.slug}`);
    await expect(page.locator('#story')).toContainText('Core quest 2 of');
    await expect(page.locator('#story').getByRole('link', { name: /Next quest/ })).toBeVisible();

    await page.goto('/d2/talismans/amethyst-lens');
    await expect(page.locator('#tiers')).toContainText('Tier I · Bronze');
    await expect(page.locator('#tiers')).toContainText('25%');
  });

  test('partial entities say so and link to the wiki page', async ({ page }) => {
    const partial = load('d1', 'mobs').find((m) => m.quality === 'partial') as Entity;
    await page.goto(`/d1/mobs/${partial.slug}`);
    await page.getByRole('button', { name: /Partial data/ }).click();
    await expect(
      page.getByRole('dialog').getByRole('link', { name: /Minecraft Wiki:/ }),
    ).toHaveAttribute('href', /minecraft\.wiki/);
    // Sections without data are simply absent: no empty headings.
    for (const heading of await page.getByRole('heading', { level: 2 }).all()) {
      await expect(heading).not.toBeEmpty();
    }
  });

  test('the sitemap lists every entity plus the static pages', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    const locs = xml.match(/<loc>/g)?.length ?? 0;
    let entities = 0;
    for (const game of ['d1', 'd2'] as const) {
      for (const category of CATEGORIES[game]) entities += countOf(game, category);
    }
    expect(entities).toBe(1467);
    expect(locs).toBe(entities + 20);
  });
});

// One seeded entity per category for all 16 pairs: renders, no overflow, axe clean in both themes.
const SEED = '20261112';
for (const game of ['d1', 'd2'] as const) {
  for (const category of CATEGORIES[game]) {
    const entity = seededPick(load(game, category), 1, `${SEED}:${game}:${category}`)[0] as Entity;
    test(`sweep: /${game}/${category}/${entity.slug}`, async ({ page }) => {
      await page.goto(`/${game}/${category}/${entity.slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(entity.name);
      await expect(page.getByRole('region', { name: 'Infobox' })).toBeVisible();
      await expect(page.getByText(/^Data and image from/)).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
      for (const theme of ['dark', 'light']) {
        await page.evaluate((t) => localStorage.setItem('dc:theme', t), theme);
        await page.reload();
        await expectNoSeriousA11yViolations(page);
      }
    });
  }
}
