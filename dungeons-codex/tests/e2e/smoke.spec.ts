import { expect, test } from '@playwright/test';

test('home page renders the H1 with Tailwind applied', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1, name: 'Dungeons Codex' });
  await expect(h1).toBeVisible();
  // Utility classes from the compiled stylesheet (uppercase, font-black) prove Tailwind ran
  // despite the bracketed path; the hero wordmark's size is fluid, so it is not asserted here.
  await expect(h1.locator('span').first()).toHaveCSS('text-transform', 'uppercase');
  await expect(h1.locator('span').first()).toHaveCSS('font-weight', '900');
});
