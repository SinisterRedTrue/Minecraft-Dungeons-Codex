import { expect, test, type Page } from '@playwright/test';

const html = (page: Page) => page.locator('html');

test.describe('theme', () => {
  test('the initial HTML response carries the inline theme script, ahead of the body', async ({
    request,
  }) => {
    const res = await request.get('/');
    expect(res.ok()).toBe(true);
    const body = await res.text();
    const script = body.indexOf("localStorage.getItem('dc:theme')");
    expect(script).toBeGreaterThan(-1);
    expect(script).toBeLessThan(body.indexOf('<body'));
  });

  test('applies the stored theme before any app JavaScript runs (no flash)', async ({
    page,
    context,
  }) => {
    await context.addInitScript(() => window.localStorage.setItem('dc:theme', 'light'));
    // Block every script chunk: if data-theme is set anyway, only the inline <head> script did it.
    await page.route('**/_next/static/**/*.js', (route) => route.abort());
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(251, 244, 226)');
  });

  test('defaults to dark and follows the OS preference when nothing is stored', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 13, 11)');

    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('toggling the theme persists across reloads', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await page.getByRole('radio', { name: 'Light' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('dc:theme'))).toBe('light');

    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('radio', { name: 'Light' })).toBeChecked();

    await page.getByRole('radio', { name: 'Dark' }).click();
    await page.reload();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });

  test('System follows the OS live', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.getByRole('radio', { name: 'System' }).click();
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(html(page)).toHaveAttribute('data-theme', 'light');
  });

  test('a theme chosen in one tab reaches another tab (storage event)', async ({
    context,
    page,
  }) => {
    await page.goto('/');
    const other = await context.newPage();
    await other.goto('/');
    await page.getByRole('radio', { name: 'Light' }).click();
    await expect(html(other)).toHaveAttribute('data-theme', 'light');
  });

  test('hydrates without console errors or hydration warnings', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || /hydrat/i.test(m.text())) problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(e.message));
    await page.context().addInitScript(() => window.localStorage.setItem('dc:theme', 'light'));
    await page.goto('/');
    await page.getByRole('radio', { name: 'Dark' }).click();
    expect(problems).toEqual([]);
  });
});
