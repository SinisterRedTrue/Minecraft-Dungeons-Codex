import { expect, test } from '@playwright/test';

test.describe('header', () => {
  test('is sticky and shrinks with a shadow after 24 px of scroll', async ({ page }) => {
    await page.goto('/d1');
    const bar = page.locator('header > div');
    await expect(bar).toHaveAttribute('data-scrolled', 'false');
    const before = (await bar.boundingBox())?.height ?? 0;
    expect(before).toBeCloseTo(68, 0);

    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(bar).toHaveAttribute('data-scrolled', 'true');
    await expect.poll(async () => (await bar.boundingBox())?.height).toBeCloseTo(56, 0);
    expect((await page.locator('header').boundingBox())?.y).toBe(0);
    expect(await bar.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe('none');

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).toHaveAttribute('data-scrolled', 'false');
  });

  test('the logo goes home', async ({ page }) => {
    await page.goto('/d2/weapons');
    await page.getByRole('link', { name: 'Dungeons Codex, home' }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('desktop shows the sections as a menu and marks the current one', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'inline sections are a desktop feature');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/d1/weapons');
    await page.getByRole('button', { name: 'Sections' }).click();
    const menu = page.getByRole('navigation', { name: 'Minecraft Dungeons sections' });
    await expect(menu.getByRole('link')).toHaveCount(8);
    await expect(menu.getByRole('link', { name: 'Weapons' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await menu.getByRole('link', { name: 'Mobs' }).click();
    await expect(page).toHaveURL(/\/d1\/mobs$/);
  });

  test('very wide screens show the sections inline', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'desktop only');
    await page.setViewportSize({ width: 1700, height: 900 });
    await page.goto('/d2/talismans');
    const nav = page.getByRole('navigation', { name: 'Minecraft Dungeons II sections' });
    await expect(nav.getByRole('link')).toHaveCount(8);
    await expect(nav.getByRole('link', { name: 'Talismans' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('neutral pages have no section links', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 1024, 'desktop only');
    await page.setViewportSize({ width: 1700, height: 900 });
    await page.goto('/about');
    await expect(page.getByRole('navigation', { name: /sections$/ })).toHaveCount(0);
  });

  test('the Favorites link shows a live count read from storage', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Favorites, 0 saved' })).toBeVisible();
    await page.evaluate(() =>
      localStorage.setItem(
        'dc:favorites:v1',
        JSON.stringify(['d1:weapons:sword', 'd2:weapons:sword']),
      ),
    );
    await page.reload();
    await expect(page.getByRole('link', { name: 'Favorites, 2 saved' })).toBeVisible();
  });

  test('a corrupt favorites value counts as zero', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('dc:favorites:v1', '{not json'));
    await page.reload();
    await expect(page.getByRole('link', { name: 'Favorites, 0 saved' })).toBeVisible();
  });
});

test.describe('skip link and landmarks', () => {
  test('the first Tab stop skips to the main content', async ({ page }) => {
    await page.goto('/d1');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main$/);
    await expect(page.locator('main#main')).toBeFocused();
  });

  test('every page has one banner, one main and one contentinfo', async ({ page }) => {
    for (const url of ['/', '/d1', '/d2', '/about', '/d1/armor', '/favorites']) {
      await page.goto(url);
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    }
  });
});

test.describe('About', () => {
  test('has credits, changes, license, privacy, disclaimer and per-game freshness', async ({
    page,
  }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle('About, Credits & License | Dungeons Codex');
    for (const heading of [
      'About',
      'How to use it',
      'Credits',
      'What we changed',
      'License',
      'Privacy',
      'Disclaimer',
      'Data freshness',
    ]) {
      await expect(
        page.getByRole('heading', { level: 2, name: heading, exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.getByText(
        'Data has been reformatted, normalized and combined from the Minecraft Wiki. Some values are computed (marked Approximate).',
      ),
    ).toBeVisible();
    const credits = page.getByRole('region', { name: 'Credits' });
    await expect(credits.getByRole('link', { name: 'Minecraft Wiki' })).toHaveAttribute(
      'href',
      'https://minecraft.wiki',
    );
    await expect(credits.getByRole('link', { name: 'CC BY-NC-SA 3.0' })).toHaveAttribute(
      'href',
      /creativecommons\.org/,
    );
    const freshness = page.getByRole('region', { name: 'Data freshness' });
    await expect(freshness.getByRole('listitem')).toHaveCount(2);
    await expect(freshness).toContainText(/last synced \d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole('region', { name: 'Privacy' })).toContainText(
      'no analytics, cookies or trackers',
    );
  });
});

test.describe('404', () => {
  test('offers search and both hubs, and the search button opens the dialog', async ({ page }) => {
    await page.goto('/nope');
    const main = page.getByRole('main');
    await expect(
      main.getByRole('link', { name: 'Minecraft Dungeons', exact: true }),
    ).toHaveAttribute('href', '/d1');
    await expect(
      main.getByRole('link', { name: 'Minecraft Dungeons II', exact: true }),
    ).toHaveAttribute('href', '/d2');
    await main.getByRole('button', { name: 'Search the Codex' }).click();
    await expect(page.getByRole('dialog', { name: 'Search the Codex' })).toBeVisible();
  });
});
