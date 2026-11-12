import { test } from '@playwright/test';
import { expectNoSeriousA11yViolations, headerSearch, settleAnimations } from './helpers';

// 0 serious/critical axe violations on the Prompt 06 pages, in both themes. Prompt 13 builds
// the full matrix; this keeps the shell honest from the start.
const PAGES = ['/', '/d1', '/d2', '/about', '/d1/weapons', '/d2/quests', '/does-not-exist'];

for (const theme of ['dark', 'light'] as const) {
  test.describe(`axe (${theme})`, () => {
    test.use({ colorScheme: theme });
    for (const url of PAGES) {
      test(`${url}`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
        await page.goto(url);
        await page.waitForLoadState('networkidle');
        await expectNoSeriousA11yViolations(page);
      });
    }

    test('the open menu sheet and the search dialog', async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('dc:theme', t), theme);
      await page.goto('/d2');
      await headerSearch(page).click();
      // Both overlays load on first use: wait for the dialog, then for its entrance to finish.
      await page.getByRole('dialog').waitFor();
      await settleAnimations(page);
      await expectNoSeriousA11yViolations(page);
      await page.keyboard.press('Escape');
      if (await page.getByRole('button', { name: 'Open menu' }).isVisible()) {
        await page.getByRole('button', { name: 'Open menu' }).click();
        await page.getByRole('dialog').waitFor();
        await settleAnimations(page);
        await expectNoSeriousA11yViolations(page);
      }
    });
  });
}
