import { expect, test } from '@playwright/test';
import { hasHorizontalScroll, headerSearch } from './helpers';

// Navigation on a phone (Prompt 06). The full responsive matrix belongs to Prompt 13.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.describe('mobile navigation', () => {
  test('the hamburger opens a sheet with every link, and a link closes it', async ({ page }) => {
    await page.goto('/d1');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(sheet).toBeVisible();
    for (const label of [
      'Weapons',
      'Armor',
      'Enchantments',
      'Artifacts',
      'DLCs',
      'Cosmetics',
      'Mobs',
      'Locations',
    ]) {
      await expect(sheet.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(sheet.getByRole('link', { name: 'Favorites' })).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'About' })).toBeVisible();
    await expect(sheet.getByRole('navigation', { name: 'Choose game' })).toBeVisible();
    await expect(sheet.getByRole('radio', { name: 'Dark' })).toBeVisible();

    await sheet.getByRole('link', { name: 'Armor', exact: true }).click();
    await expect(page).toHaveURL(/\/d1\/armor$/);
    await expect(sheet).toBeHidden();
  });

  test('on a neutral page the sheet lists both games', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await expect(
      sheet.getByRole('navigation', { name: 'Minecraft Dungeons sections' }),
    ).toBeVisible();
    await expect(
      sheet.getByRole('navigation', { name: 'Minecraft Dungeons II sections' }),
    ).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'Talismans' })).toBeVisible();
  });

  test('the sheet switches game and closes with Escape', async ({ page }) => {
    await page.goto('/d1/weapons');
    await page.getByRole('button', { name: 'Open menu' }).click();
    const sheet = page.getByRole('dialog', { name: 'Menu' });
    await sheet
      .getByRole('navigation', { name: 'Choose game' })
      .getByRole('link', { name: /^D2/ })
      .click();
    await expect(page).toHaveURL(/\/d2\/weapons$/);
    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });

  test('the header keeps Search and Favorites reachable', async ({ page }) => {
    await page.goto('/');
    await expect(headerSearch(page)).toBeVisible();
    await expect(page.getByRole('link', { name: /^Favorites, \d+ saved$/ })).toBeVisible();
  });

  for (const url of ['/', '/d1', '/d2', '/about', '/d1/weapons', '/does-not-exist']) {
    for (const width of [360, 390]) {
      test(`no horizontal scroll on ${url} at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto(url);
        expect(await hasHorizontalScroll(page)).toBe(false);
      });
    }
  }
});
