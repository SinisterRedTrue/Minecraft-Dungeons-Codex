import { expect, test } from '@playwright/test';
import { countOf, headerSearch } from './helpers';

test.describe('Game Picker (/)', () => {
  test('shows the hero, the wordmark and the tagline', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Dungeons Codex: Minecraft Dungeons & Dungeons II wiki');
    await expect(page.getByRole('heading', { level: 1, name: 'Dungeons Codex' })).toBeVisible();
    await expect(
      page.getByText('Every weapon, armor, enchantment and mob of Dungeons I & II.'),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Scroll to the games' })).toHaveAttribute(
      'href',
      '#choose',
    );
  });

  test('floats 10–14 real item icons in the hero, the same on every load', async ({ page }) => {
    await page.goto('/');
    const icons = page.locator('section[aria-label="Welcome"] img');
    const count = await icons.count();
    expect(count).toBeGreaterThanOrEqual(10);
    expect(count).toBeLessThanOrEqual(14);
    const srcs = await icons.evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    for (const src of srcs) expect(src).toMatch(/^\/images\/d[12]\/[a-z]+\/[a-z0-9-]+\.webp$/);
    await page.reload();
    const again = await icons.evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    expect(again).toEqual(srcs);
  });

  test('the search pill and Ctrl+K open the search dialog', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('main')
      .getByRole('button', { name: /^Search the Codex/ })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Search the Codex' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await headerSearch(page).click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await page.keyboard.press('Control+k');
    await expect(dialog).toBeVisible();
  });

  test('two game cards show live counts from the data and link to the hubs', async ({ page }) => {
    await page.goto('/');
    const d1 = page.getByRole('link', { name: /Enter Dungeons$/ });
    const d2 = page.getByRole('link', { name: /Enter Dungeons II$/ });
    await expect(d1).toHaveAttribute('href', '/d1');
    await expect(d2).toHaveAttribute('href', '/d2');
    await expect(d1).toContainText(`${countOf('d1', 'weapons')} weapons`);
    await expect(d1).toContainText(`${countOf('d1', 'armor')} armor`);
    await expect(d1).toContainText(`${countOf('d1', 'dlcs')} DLCs`);
    await expect(d2).toContainText(`${countOf('d2', 'weapons')} weapons`);
    await expect(d2).toContainText(`${countOf('d2', 'talismans')} talismans`);
    await expect(d2).toContainText(`${countOf('d2', 'quests')} quests`);
  });

  test('each game card carries its own accent, even on the neutral page', async ({ page }) => {
    await page.goto('/');
    // The accent is a token alias; compare the resolved colour of the button's gradient end.
    const resolved = async (name: RegExp) =>
      page
        .getByRole('link', { name })
        .locator('.b3d')
        .evaluate((el) => {
          const probe = document.createElement('span');
          probe.style.color = getComputedStyle(el).getPropertyValue('--b-to');
          document.body.append(probe);
          const color = getComputedStyle(probe).color;
          probe.remove();
          return color;
        });
    expect(await resolved(/Enter Dungeons$/)).toBe('rgb(59, 209, 111)');
    expect(await resolved(/Enter Dungeons II$/)).toBe('rgb(79, 216, 235)');
  });

  test('the divider slides toward the other side on hover and on keyboard focus', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'touch has no hover, so no shift');
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    const split = page.locator('.split');
    const split$ = () => split.evaluate((el) => getComputedStyle(el).getPropertyValue('--split'));
    await split.scrollIntoViewIfNeeded();
    expect(await split$()).toBe('0%');

    // Both halves are one joined panel: each link only reacts inside its own diagonal shape.
    const box = (await split.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
    await expect.poll(split$).toBe('9%');
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.5);
    await expect.poll(split$).toBe('-9%');
    await page.mouse.move(box.x - 40, box.y - 40);
    await expect.poll(split$).toBe('0%');

    // Keyboard focus does the same (and works without a mouse).
    await page.getByRole('link', { name: /Enter Dungeons II$/ }).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(split$).toBe('-9%');
    await page.getByRole('link', { name: /Enter Dungeons$/ }).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(split$).toBe('9%');
  });

  test('clicking a game card enters that game with its accent', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Enter Dungeons II$/ }).click();
    await expect(page).toHaveURL(/\/d2$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Minecraft Dungeons II' }),
    ).toBeVisible();
  });

  test('"What\'s inside" has six feature cards', async ({ page }) => {
    await page.goto('/');
    const section = page.getByRole('region', { name: 'Tools for every dungeon delver' });
    await expect(section.getByRole('heading', { level: 3 })).toHaveText([
      'Filters',
      'Power Forge',
      'Compare',
      'Build Planner',
      'Favorites',
      'Search',
    ]);
  });

  test('the footer carries the exact legal text and the sync date', async ({ page }) => {
    await page.goto('/');
    const footer = page.getByRole('contentinfo');
    await expect(footer).toContainText(
      'Data © Minecraft Wiki contributors · CC BY-NC-SA 3.0 · Last synced',
    );
    await expect(footer).toContainText(/Last synced \d{4}-\d{2}-\d{2}/);
    await expect(footer).toContainText(
      'Dungeons Codex is an unofficial fan site. NOT AN OFFICIAL MINECRAFT PRODUCT. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT. Game data and images from the Minecraft Wiki (minecraft.wiki), licensed CC BY-NC-SA 3.0.',
    );
    await expect(footer.getByRole('link', { name: 'About & Credits' })).toHaveAttribute(
      'href',
      '/about',
    );
  });
});
