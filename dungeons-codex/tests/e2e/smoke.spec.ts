import { expect, test } from '@playwright/test';

test('home page renders the H1 with Tailwind applied', async ({ page }) => {
  await page.goto('/');
  const h1 = page.getByRole('heading', { level: 1, name: 'Dungeons Codex' });
  await expect(h1).toBeVisible();
  // text-4xl is 2.25rem = 36px; proves Tailwind compiled despite the bracketed path.
  await expect(h1).toHaveCSS('font-size', '36px');
});
