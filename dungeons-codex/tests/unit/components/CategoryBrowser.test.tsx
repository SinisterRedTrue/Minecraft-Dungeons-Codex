import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { describe, expect, it, vi } from 'vitest';
import { CategoryBrowser, type CategoryBrowserProps } from '@/components/filters/CategoryBrowser';
import { ToastProvider } from '@/components/ui/Toast';
import { TEXT_DEF } from '@/config/filters';
import type { EntityListItem } from '@/lib/schemas';
import { DAMAGE, ITEMS, KIND, PROPS, SORT, UNIQUE, WEAPON_TYPE } from '../lib/filters/fixtures';

const items = ITEMS.map((i) => ({
  game: 'd1',
  category: 'weapons',
  slug: String(i.name).toLowerCase(),
  quality: 'verified',
  ...i,
})) as unknown as EntityListItem[];

const base: CategoryBrowserProps = {
  label: 'Weapons',
  items,
  defs: [KIND, WEAPON_TYPE, DAMAGE, PROPS, UNIQUE, TEXT_DEF],
  sort: SORT,
  grid: {
    cardStats: [{ label: 'DMG', field: 'stats.damage', format: 'decimal' }],
    cardMeta: ['weaponType'],
  },
  columns: [
    { key: 'damage', label: 'Damage', field: 'stats.damage', format: 'decimal', sort: 'dmg' },
  ],
  labels: {},
};

function setup(searchParams = '', props: Partial<CategoryBrowserProps> = {}) {
  const onUrlUpdate = vi.fn();
  render(
    <ToastProvider>
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
        <CategoryBrowser {...base} {...props} />
      </NuqsTestingAdapter>
    </ToastProvider>,
  );
  const lastQuery = () => onUrlUpdate.mock.lastCall?.[0].queryString as string | undefined;
  const lastHistory = () => onUrlUpdate.mock.lastCall?.[0].options.history as string | undefined;
  const names = () =>
    screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
      .sort();
  return { onUrlUpdate, lastQuery, lastHistory, names };
}

describe('CategoryBrowser', () => {
  it('lists every item with a live result count', () => {
    setup();
    expect(screen.getByRole('status')).toHaveTextContent('5 results');
    expect(screen.getAllByRole('article')).toHaveLength(5);
    expect(screen.getByRole('link', { name: 'Sword' })).toHaveAttribute(
      'href',
      '/d1/weapons/sword',
    );
  });

  it('reads its state from the URL', () => {
    const { names } = setup('t=melee&wt=daggers');
    expect(names()).toEqual(['Daggers']);
    expect(screen.getByRole('status')).toHaveTextContent('1 result of 5');
    expect(screen.getByRole('button', { name: 'Remove filter: Daggers' })).toBeInTheDocument();
  });

  it('ignores invalid URL state quietly', () => {
    setup('t=nonsense&dmg=oops&p=zzz&u=maybe&sort=nope&view=cube');
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('choosing a chip pushes it to the URL and reveals level 2', async () => {
    const { lastQuery, lastHistory } = setup();
    await userEvent.click(screen.getByRole('button', { name: /^Melee/ }));
    expect(lastQuery()).toBe('?t=melee');
    expect(lastHistory()).toBe('push');
    expect(screen.getByRole('group', { name: 'Weapon type' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Daggers/ }));
    expect(lastQuery()).toBe('?t=melee&wt=daggers');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('a toggle and a property go to the URL; Clear all empties it', async () => {
    const { lastQuery } = setup();
    // The panel is in the DOM twice only when the sheet is open; here it is the sidebar copy.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Unique only' }));
    expect(lastQuery()).toBe('?u=1');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await userEvent.click(screen.getByRole('checkbox', { name: /Charged Shots/ }));
    expect(lastQuery()).toBe('?u=1&p=charged-shots');
    expect(screen.getAllByRole('article')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(lastQuery()).toBe('');
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('a range and the search box replace the history entry', async () => {
    const { lastQuery, lastHistory } = setup();
    const min = screen.getByRole('spinbutton', { name: 'Minimum Damage' });
    await userEvent.clear(min);
    await userEvent.type(min, '7{Enter}');
    expect(lastQuery()).toBe('?dmg=7-9');
    expect(lastHistory()).toBe('replace');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search in results' }), 'dag');
    expect(lastQuery()).toContain('q=dag');
    expect(lastHistory()).toBe('replace');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });

  it('removing a chip clears just that filter', async () => {
    const { lastQuery } = setup('t=melee&p=dual-wield');
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Dual Wield' }));
    expect(lastQuery()).toBe('?t=melee');
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('sorts from the URL and switches to the table view', async () => {
    const { lastQuery, names } = setup('sort=name-desc');
    expect(names()[0]).toBe('Bow');
    const cards = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(cards[0]).toBe('Sword');
    await userEvent.click(screen.getByRole('button', { name: 'Table view' }));
    expect(lastQuery()).toContain('view=table');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
  });

  it('offers a way out of an empty result', async () => {
    const { lastQuery } = setup('t=ranged&u=1&p=dual-wield&wt=bow');
    expect(screen.getByRole('heading', { name: 'No items match' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Remove “/ }));
    expect(lastQuery()).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));
    expect(lastQuery()).toBe('');
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('the mobile sheet shows the live count and clears', async () => {
    setup('u=1');
    await userEvent.click(screen.getByRole('button', { name: 'Filters (1)' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    // The search box must not grab focus (it would open the phone keyboard).
    expect(sheet).toHaveFocus();
    expect(within(sheet).getByRole('button', { name: 'Show 2 results' })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Clear' }));
    expect(within(sheet).getByRole('button', { name: 'Show 5 results' })).toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Show 5 results' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has no filter UI when there are no filters (DLC cards)', () => {
    setup('', { defs: [], label: 'DLCs' });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Filters/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(5);
  });

  it('groups cards when the group chip is on', async () => {
    const grouped = items.map((i, index) => ({ ...i, armorSet: index < 3 ? 'One' : 'Two' }));
    const { lastQuery } = setup('', {
      items: grouped as EntityListItem[],
      groupBy: {
        param: 'grp',
        label: 'Group by set',
        field: 'armorSet',
        order: { field: 'name', rank: [] },
      },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Group by set' }));
    expect(lastQuery()).toBe('?grp=1');
    expect(screen.getByRole('region', { name: 'One' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Two' })).getAllByRole('listitem'),
    ).toHaveLength(2);
  });
});
