import { readFileSync } from 'node:fs';
import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** Entity count of one category, read straight from the generated data. */
export function countOf(game: 'd1' | 'd2', category: string): number {
  const file = path.join(process.cwd(), 'data', 'generated', game, `${category}.json`);
  return (JSON.parse(readFileSync(file, 'utf8')) as unknown[]).length;
}

/**
 * A theme radio. Below `md` the toggle lives in the menu sheet, so open it first when the
 * header's own toggle is hidden. Works the same on every viewport.
 */
export async function themeRadio(page: Page, name: 'Light' | 'Dark' | 'System'): Promise<Locator> {
  const radio = page.getByRole('radio', { name, exact: true });
  if (!(await radio.isVisible())) {
    await page.getByRole('button', { name: 'Open menu' }).click();
  }
  return radio;
}

/** The header's Search button: "Search", plus the "⌘K" hint from `lg` up (it is generated content, which counts toward the name). */
export function headerSearch(page: Page): Locator {
  return page.getByRole('banner').getByRole('button', { name: /^Search( ⌘K)?$/ });
}

/** Fails on serious or critical axe violations (Plans 08: 0 serious/critical on every page). */
export async function expectNoSeriousA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(
    serious.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`,
    ),
  ).toEqual([]);
}

/** True when the page scrolls sideways. */
export async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}
