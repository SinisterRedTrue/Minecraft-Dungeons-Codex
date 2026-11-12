import { expect, test, type Page } from '@playwright/test';
import { countOf, hasHorizontalScroll, headerSearch } from './helpers';

const D1 = [
  'weapons',
  'armor',
  'enchantments',
  'artifacts',
  'dlcs',
  'cosmetics',
  'mobs',
  'locations',
];
const D2 = [
  'weapons',
  'armor',
  'enchantments',
  'artifacts',
  'talismans',
  'quests',
  'mobs',
  'locations',
];
const LABEL: Record<string, string> = {
  weapons: 'Weapons',
  armor: 'Armor',
  enchantments: 'Enchantments',
  artifacts: 'Artifacts',
  dlcs: 'DLCs',
  cosmetics: 'Cosmetics',
  mobs: 'Mobs',
  locations: 'Locations',
  talismans: 'Talismans',
  quests: 'Quests',
};

const accent = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).getPropertyValue('--accent').trim().toLowerCase());

for (const [game, name, categories, hex] of [
  ['d1', 'Minecraft Dungeons', D1, '#3bd16f'],
  ['d2', 'Minecraft Dungeons II', D2, '#4fd8eb'],
] as const) {
  test.describe(`/${game} hub`, () => {
    test('has the hero band with the synced chip and the breadcrumb', async ({ page }) => {
      await page.goto(`/${game}`);
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
      await expect(page.getByText(/^Synced \d{4}-\d{2}-\d{2}$/i)).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText(name);
      const total = categories.reduce((sum, c) => sum + countOf(game, c), 0);
      await expect(
        page.getByText(`Explore ${total.toLocaleString('en-US')} entries across 8 sections.`),
      ).toBeVisible();
    });

    test('shows the 8 section tiles with correct counts and links', async ({ page }) => {
      await page.goto(`/${game}`);
      const tiles = page.getByRole('region', { name: 'Sections' }).getByRole('link');
      await expect(tiles).toHaveCount(8);
      for (const category of categories) {
        const tile = page
          .getByRole('region', { name: 'Sections' })
          .locator(`a[href="/${game}/${category}"]`);
        await expect(tile).toContainText(LABEL[category] ?? category);
        await expect(tile).toContainText(countOf(game, category).toLocaleString('en-US'));
        await expect(tile.locator('img')).toHaveAttribute(
          'src',
          new RegExp(`^/images/d[12]/[a-z]+/.+\\.webp$`),
        );
      }
    });

    test('lists 8 featured uniques, and the same 8 after a reload', async ({ page }) => {
      await page.goto(`/${game}`);
      const items = page
        .getByRole('list', { name: new RegExp(`Featured unique items in ${name}$`) })
        .getByRole('link');
      await expect(items).toHaveCount(8);
      const hrefs = await items.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      for (const href of hrefs)
        expect(href).toMatch(new RegExp(`^/${game}/(weapons|armor)/[a-z0-9-]+$`));
      await page.reload();
      expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute('href')))).toEqual(
        hrefs,
      );
    });

    test('has the tools row', async ({ page }) => {
      await page.goto(`/${game}`);
      await expect(page.getByRole('link', { name: 'Compare', exact: true }).last()).toHaveAttribute(
        'href',
        `/${game}/compare`,
      );
      await expect(page.getByRole('link', { name: 'Build Planner', exact: true })).toHaveAttribute(
        'href',
        `/${game}/planner`,
      );
      await expect(
        page.getByRole('link', { name: 'Favorites', exact: true }).last(),
      ).toHaveAttribute('href', '/favorites');
    });

    test('server HTML already carries the right accent wrapper (no flash)', async ({ request }) => {
      const html = await (await request.get(`/${game}`)).text();
      const wrapper = html.indexOf(`<div data-game="${game}"`);
      expect(wrapper).toBeGreaterThan(-1);
      expect(wrapper).toBeLessThan(html.indexOf('<header'));
    });

    test('header, main and footer resolve the game accent', async ({ page }) => {
      await page.goto(`/${game}`);
      expect(await accent(page, 'header')).toBe(hex);
      expect(await accent(page, 'main')).toBe(hex);
      expect(await accent(page, 'footer')).toBe(hex);
    });

    test('no horizontal scroll at 1024, 1280 and 1440', async ({ page }) => {
      for (const width of [1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${game}`);
        expect(await hasHorizontalScroll(page), `${width}px`).toBe(false);
      }
    });
  });
}

test.describe('D1 only', () => {
  test('/d1 has the DLC strip in release order, /d2 does not', async ({ page }) => {
    await page.goto('/d1');
    const dlcs = page
      .getByRole('list', { name: 'DLC adventures in release order' })
      .getByRole('link');
    await expect(dlcs).toHaveCount(countOf('d1', 'dlcs'));
    await expect(dlcs.first()).toContainText('Jungle Awakens');
    await expect(dlcs.nth(1)).toContainText('Creeping Winter');
    await page.goto('/d2');
    await expect(page.getByRole('heading', { name: 'DLC adventures' })).toHaveCount(0);
  });
});

test.describe('accent without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('D2 is frost from the server HTML alone', async ({ page }) => {
    await page.goto('/d2');
    expect(await accent(page, 'header')).toBe('#4fd8eb');
    await page.goto('/d1');
    expect(await accent(page, 'header')).toBe('#3bd16f');
  });
});

test.describe('D2 accent reaches overlays', () => {
  test('the body mirrors the game, and a portalled dialog is frost on D2', async ({ page }) => {
    await page.goto('/d2');
    await expect(page.locator('body')).toHaveAttribute('data-game', 'd2');
    await headerSearch(page).click();
    const dialog = page.getByRole('dialog', { name: 'Search the Codex' });
    await expect(dialog).toBeVisible();
    expect(
      await dialog.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--accent').trim().toLowerCase(),
      ),
    ).toBe('#4fd8eb');
    await page.keyboard.press('Escape');
    // Leaving the game clears the mirror.
    await page.getByRole('link', { name: 'Dungeons Codex, home' }).first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('body')).not.toHaveAttribute('data-game', /.+/);
  });
});

test.describe('category pages and routing', () => {
  for (const [game, categories] of [
    ['d1', D1],
    ['d2', D2],
  ] as const) {
    test(`all 8 ${game} category links resolve (no 404s from the hub)`, async ({ page }) => {
      for (const category of categories) {
        const res = await page.goto(`/${game}/${category}`);
        expect(res?.status(), `${game}/${category}`).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toContainText(
          LABEL[category] ?? category,
        );
        await expect(page.getByRole('region', { name: 'Results' })).toBeVisible();
        await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
      }
    });
  }

  test('tool and favorites pages exist, so hub links never 404', async ({ page }) => {
    for (const url of ['/d1/compare', '/d2/compare', '/d1/planner', '/d2/planner', '/favorites']) {
      expect((await page.goto(url))?.status(), url).toBe(200);
    }
  });

  test('unknown games, sections and URLs are friendly 404s', async ({ page }) => {
    for (const url of ['/d3', '/d1/nope', '/d1/talismans', '/d2/dlcs', '/does-not-exist']) {
      const res = await page.goto(url);
      expect(res?.status(), url).toBe(404);
      await expect(page.getByRole('heading', { name: 'This chest is empty' })).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Minecraft Dungeons', exact: true }).last(),
      ).toBeVisible();
    }
  });
});

test.describe('GameSwitcher', () => {
  test('keeps the section when the other game has it, else goes to the hub', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'the pill is in the menu on phones');
    await page.goto('/d1/weapons');
    const nav = page.getByRole('navigation', { name: 'Choose game' });
    await nav.getByRole('link', { name: /^D2/ }).click();
    await expect(page).toHaveURL(/\/d2\/weapons$/);
    await expect(nav.getByRole('link', { name: /^D2/ })).toHaveAttribute('aria-current', 'true');
    await page.goto('/d1/dlcs');
    await nav.getByRole('link', { name: /^D2/ }).click();
    await expect(page).toHaveURL(/\/d2$/);
  });
});
