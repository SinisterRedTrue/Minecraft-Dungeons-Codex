import { expect, test } from '@playwright/test';
import { collectConsoleProblems, themeRadio } from './helpers';

// Prompt 14, task 2 (D-107): security headers on every response, and a CSP strict enough to mean
// something that the site still runs under: theme script, hydration, search index fetch, fonts.
// The headers come from `next.config.ts`; `next dev` needs `unsafe-eval`, so these assertions are
// about the production build that `npm run e2e` serves.

const devServer = process.env.E2E_DEV_SERVER === '1';

test.skip(
  devServer,
  'the CSP of `next dev` differs (unsafe-eval); headers are asserted on the production build',
);

const PAGES = ['/', '/d1', '/d1/weapons', '/d1/weapons/claymore', '/d2/planner', '/about'];

test.describe('security headers', () => {
  for (const url of PAGES) {
    test(`${url} sends the security headers`, async ({ request }) => {
      const res = await request.get(url);
      expect(res.status()).toBe(200);
      const h = res.headers();
      expect(h['x-content-type-options']).toBe('nosniff');
      expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(h['x-frame-options']).toBe('DENY');
      expect(h['permissions-policy']).toContain('camera=()');
      expect(h['permissions-policy']).toContain('microphone=()');
      expect(h['permissions-policy']).toContain('geolocation=()');
    });
  }

  test('static assets and data files carry them too', async ({ request }) => {
    for (const url of ['/search/d1.json', '/brand/logo.svg', '/robots.txt', '/sitemap.xml']) {
      const res = await request.get(url);
      expect(res.status(), url).toBe(200);
      expect(res.headers()['x-content-type-options'], url).toBe('nosniff');
      expect(res.headers()['content-security-policy'], url).toBeTruthy();
    }
  });

  test('a 404 page is covered as well', async ({ request }) => {
    const res = await request.get('/no-such-page');
    expect(res.status()).toBe(404);
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['content-security-policy']).toBeTruthy();
  });
});

test.describe('content security policy', () => {
  test('lists only same-origin sources and forbids framing, plugins and foreign forms', async ({
    request,
  }) => {
    const res = await request.get('/');
    const csp = res.headers()['content-security-policy'] ?? '';
    const directives = new Map(
      csp
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean)
        .map((d) => {
          const [name, ...values] = d.split(/\s+/);
          return [name, values] as const;
        }),
    );
    expect(directives.get('default-src')).toEqual(["'self'"]);
    expect(directives.get('object-src')).toEqual(["'none'"]);
    expect(directives.get('base-uri')).toEqual(["'self'"]);
    expect(directives.get('form-action')).toEqual(["'self'"]);
    expect(directives.get('frame-ancestors')).toEqual(["'none'"]);
    expect(directives.get('connect-src')).toEqual(["'self'"]);
    expect(directives.get('font-src')).toEqual(["'self'"]);
    expect(directives.get('script-src')).not.toContain("'unsafe-eval'");
    // No directive may name a foreign origin: the site loads nothing from anywhere else.
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain('*');
  });

  test('the site runs under it: no CSP violations, theme script applies, search loads', async ({
    page,
  }) => {
    const problems = collectConsoleProblems(page);
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __csp: string[] }).__csp ??= [];
        (window as unknown as { __csp: string[] }).__csp.push(
          `${e.violatedDirective} ${e.blockedURI}`,
        );
      });
    });

    await page.goto('/d1/weapons/claymore');
    // The no-flash script ran before paint: the theme attribute is set without any interaction.
    await expect(page.locator('html')).toHaveAttribute('data-theme', /^(light|dark)$/);

    // Hydration works (a client interaction changes the DOM): switch theme through the toggle.
    await (await themeRadio(page, 'Light')).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // The search palette lazy-loads code and fetches its index from our own origin.
    const index = page.waitForResponse((r) => r.url().endsWith('/search/d1.json') && r.ok());
    await page.keyboard.press('Control+k');
    await index;
    await page.getByRole('combobox').fill('clay');
    await expect(page.getByRole('option').first()).toBeVisible();

    violations.push(
      ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
    );
    expect(violations).toEqual([]);
    expect(problems.filter((p) => /content security policy/i.test(p))).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('self-hosted fonts and images load under font-src and img-src', async ({ page }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __csp: string[] }).__csp ??= [];
        (window as unknown as { __csp: string[] }).__csp.push(
          `${e.violatedDirective} ${e.blockedURI}`,
        );
      });
    });
    await page.goto('/d1/weapons');
    await page.evaluate(() => document.fonts.ready);
    const rubik = await page.evaluate(() => document.fonts.check('16px Rubik'));
    expect(rubik).toBe(true);
    await expect(page.locator('img').first()).toBeVisible();
    violations.push(
      ...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])),
    );
    expect(violations).toEqual([]);
  });
});
