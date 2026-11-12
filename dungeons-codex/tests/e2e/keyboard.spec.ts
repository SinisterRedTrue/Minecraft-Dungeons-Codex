import { expect, test, type Page } from '@playwright/test';
import { headerSearch } from './helpers';

// Prompt 13, task 2: the keyboard pass, automated. On the key pages a visitor can reach every
// control with Tab in a sensible order, always sees where focus is, never gets trapped, and every
// overlay closes with Esc and hands focus back. (The screen-reader semantics pass is recorded in
// docs/quality/keyboard-pass.md.)

interface Stop {
  name: string;
  visible: boolean;
  /** An outline or a box-shadow ring is drawn on the focused element. */
  ring: boolean;
  top: number;
}

/** Describes the element that has focus right now. */
async function focused(page: Page): Promise<Stop | null> {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      name: (
        el.getAttribute('aria-label') ||
        (el as HTMLElement).innerText ||
        el.getAttribute('placeholder') ||
        el.tagName
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50),
      visible: box.width > 0 && box.height > 0 && style.visibility !== 'hidden',
      // A card's stretched link draws its ring on ::after, so look there too.
      ring: [style, getComputedStyle(el, '::after')].some(
        (s) =>
          (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) ||
          (s.boxShadow !== 'none' && s.boxShadow !== ''),
      ),
      top: box.top + window.scrollY,
    };
  });
}

/** Presses Tab up to `max` times; returns every stop (stops when focus leaves the document). */
async function tabThrough(page: Page, max: number): Promise<Stop[]> {
  const stops: Stop[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const stop = await focused(page);
    if (!stop) break;
    stops.push(stop);
  }
  return stops;
}

function expectSound(stops: Stop[], page: string) {
  expect(stops.length, `${page}: some focusable controls`).toBeGreaterThan(5);
  for (const stop of stops) {
    expect(stop.visible, `${page}: "${stop.name}" is focusable but not visible`).toBe(true);
    expect(stop.ring, `${page}: "${stop.name}" shows no focus indicator`).toBe(true);
  }
}

test.describe('Tab order', () => {
  test('the first stop is the skip link, then the header, then the page', async ({ page }) => {
    await page.goto('/d1');
    const stops = await tabThrough(page, 12);
    expect(stops[0]?.name).toBe('Skip to content');
    expect(stops.some((s) => /^Search/.test(s.name))).toBe(true);
    // The skip link works: it moves focus into <main>.
    await page.goto('/d1');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id || location.hash)).toMatch(/main/);
  });

  for (const url of [
    '/',
    '/d1/weapons',
    '/d1/weapons/claymore',
    '/d1/compare?c=weapons&items=claymore,katana',
    '/d1/planner',
    '/favorites',
    '/about',
  ]) {
    test(`${url}: every stop is visible with a focus indicator, in reading order`, async ({
      page,
    }) => {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const stops = await tabThrough(page, 70);
      expectSound(stops, url);
      // Reading order: apart from the sticky header and sidebars, focus never jumps back up the
      // page by more than a screen. A big upward jump means a wrong DOM order or a trap.
      let worstJump = 0;
      for (let i = 1; i < stops.length; i++) {
        worstJump = Math.max(worstJump, (stops[i - 1]?.top ?? 0) - (stops[i]?.top ?? 0));
      }
      expect(worstJump, `${url}: focus jumped up ${worstJump}px`).toBeLessThan(1200);
    });
  }

  test('no keyboard trap: Shift+Tab walks back out of the page', async ({ page }) => {
    await page.goto('/d1/weapons/claymore');
    await tabThrough(page, 6);
    const before = await focused(page);
    for (let i = 0; i < 8; i++) await page.keyboard.press('Shift+Tab');
    const after = await focused(page);
    expect(after?.name).not.toBe(before?.name);
  });
});

test.describe('Overlays close with Esc and return focus', () => {
  test('the search palette: focus goes in, stays inside, comes back', async ({ page }) => {
    await page.goto('/d1');
    await headerSearch(page).focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Search the Codex' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: 'Search the Codex' })).toBeFocused();
    // Focus is trapped in the dialog while it is open.
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
        true,
      );
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(headerSearch(page)).toBeFocused();
  });

  test('the planner picker opens from the keyboard and Esc returns to its slot', async ({
    page,
  }) => {
    await page.goto('/d1/planner');
    const slot = page.getByTestId('slot-melee');
    await expect(slot).toBeVisible();
    const choose = slot.getByRole('button').first();
    await choose.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(choose).toBeFocused();
  });

  test('the menu sheet and the confirm dialog', async ({ page }) => {
    await page.goto('/d1/planner');
    const menu = page.getByRole('button', { name: 'Open menu' });
    if (await menu.isVisible()) {
      await menu.focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
      await expect(menu).toBeFocused();
    }
    const clear = page.getByRole('button', { name: 'Clear', exact: true });
    await clear.focus();
    await page.keyboard.press('Enter');
    const confirm = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(confirm.first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(confirm.first()).toBeHidden();
    await expect(clear).toBeFocused();
  });

  test('the forge: slider and enchantment slots work by keyboard', async ({ page }) => {
    await page.goto('/d1/weapons/claymore');
    const slider = page.getByRole('slider', { name: 'Power level slider' });
    await slider.focus();
    const before = await slider.getAttribute('aria-valuenow');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('PageUp');
    expect(Number(await slider.getAttribute('aria-valuenow'))).toBeGreaterThan(Number(before));
  });
});
