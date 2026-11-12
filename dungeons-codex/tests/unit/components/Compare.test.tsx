import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CompareButton } from '@/components/features/compare/CompareButton';
import { CompareTable, visibleRows } from '@/components/features/compare/CompareTable';
import { CompareTray, compareHref } from '@/components/features/compare/CompareTray';
import { CompareView, type CompareCategory } from '@/components/features/compare/CompareView';
import { ToastProvider } from '@/components/ui/Toast';
import type { CompareRow } from '@/config/categories';
import { resetCompareCache } from '@/lib/compare/load';
import { addToCompare, clearCompare, compareStore } from '@/lib/compare/store';
import type { CompareEntry } from '@/lib/compare/types';

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ToastProvider });

const ROWS: CompareRow[] = [
  { label: 'Damage', field: 'stats.damage', format: 'decimal', better: 'high' },
  { label: 'Cooldown', field: 'cooldown', format: 'seconds', better: 'low' },
  { label: 'Combo length', field: 'combo', format: 'int' },
  { label: 'Properties', field: 'props', format: 'list' },
  { label: 'Unused', field: 'nothing', format: 'text' },
];

const ENTRIES: CompareEntry[] = [
  {
    s: 'claymore',
    n: 'Claymore',
    r: 'common',
    v: { 'stats.damage': 11.5, cooldown: 20, combo: 3, props: ['Powerful pushback'] },
  },
  {
    s: 'katana',
    n: 'Katana',
    r: 'rare',
    v: { 'stats.damage': 7, cooldown: 8, combo: 3, props: ['Fast', 'Light'] },
  },
  { s: 'daggers', n: 'Daggers', r: 'common', v: { 'stats.damage': 11.5, combo: 3 } },
];

function row(label: string): HTMLElement {
  return screen.getByRole('row', { name: new RegExp(`^${label}`, 'i') });
}

describe('visibleRows', () => {
  it('prepends Rarity when anyone has one, drops rows nobody has data for', () => {
    const rows = visibleRows(ROWS, ENTRIES, false);
    expect(rows.map((r) => r.row.label)).toEqual([
      'Rarity',
      'Damage',
      'Cooldown',
      'Combo length',
      'Properties',
    ]);
  });

  it('with differencesOnly keeps just the rows that differ', () => {
    // Combo length is 3 for all three, so it goes; Rarity, Damage, Cooldown and Properties stay.
    expect(visibleRows(ROWS, ENTRIES, true).map((r) => r.row.label)).toEqual([
      'Rarity',
      'Damage',
      'Cooldown',
      'Properties',
    ]);
  });
});

describe('CompareTable', () => {
  const table = (extra: Partial<Parameters<typeof CompareTable>[0]> = {}) => (
    <CompareTable
      game="d1"
      category="weapons"
      caption="Comparison of 3 weapons"
      rows={ROWS}
      entries={ENTRIES}
      diffOnly={false}
      onRemove={() => {}}
      {...extra}
    />
  );

  it('has a caption, column headers with links, and row headers', () => {
    render(table());
    expect(screen.getByRole('table', { name: 'Comparison of 3 weapons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Katana' })).toHaveAttribute(
      'href',
      '/d1/weapons/katana',
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(4);
    expect(screen.getByRole('rowheader', { name: 'Damage' })).toBeInTheDocument();
  });

  it('marks the best value where higher is better, ties included, with text for screen readers', () => {
    render(table());
    const cells = within(row('Damage')).getAllByRole('cell');
    expect(cells.map((c) => c.hasAttribute('data-best'))).toEqual([true, false, true]);
    expect(cells[0]).toHaveTextContent(/11\.5.*\(best\)/);
    expect(cells[1]).not.toHaveTextContent('best');
  });

  it('marks the lowest value when lower is better (cooldown), ignoring items without one', () => {
    render(table());
    const cells = within(row('Cooldown')).getAllByRole('cell');
    expect(cells.map((c) => c.hasAttribute('data-best'))).toEqual([false, true, false]);
    expect(cells[2]).toHaveTextContent('–');
  });

  it('marks nothing on a row with no direction or equal values', () => {
    render(table());
    for (const cell of within(row('Combo length')).getAllByRole('cell')) {
      expect(cell).not.toHaveAttribute('data-best');
    }
  });

  it('shows list rows as bullet lists', () => {
    render(table());
    const cells = within(row('Properties')).getAllByRole('cell');
    expect(within(cells[1] as HTMLElement).getAllByRole('listitem')).toHaveLength(2);
  });

  it('Differences only hides the rows where every item matches', () => {
    const { rerender } = render(table());
    expect(screen.getByRole('rowheader', { name: 'Combo length' })).toBeInTheDocument();
    rerender(table({ diffOnly: true }));
    expect(screen.queryByRole('rowheader', { name: 'Combo length' })).toBeNull();
    expect(screen.getByRole('rowheader', { name: 'Damage' })).toBeInTheDocument();
  });

  it('says so when differences-only leaves nothing', () => {
    const same = ENTRIES.slice(0, 2).map((e) => ({ ...e, r: 'common', v: { combo: 3 } }));
    render(table({ entries: same, diffOnly: true }));
    expect(screen.getByText(/same in every row/)).toBeInTheDocument();
  });

  it('removes an item through its named button', async () => {
    const onRemove = vi.fn();
    render(table({ onRemove }));
    await userEvent.click(screen.getByRole('button', { name: 'Remove Katana from comparison' }));
    expect(onRemove).toHaveBeenCalledWith('katana');
  });
});

describe('CompareButton', () => {
  beforeEach(() => clearCompare(compareStore('d1')));
  const item = { game: 'd1' as const, category: 'weapons', slug: 'claymore', name: 'Claymore' };

  it('is a toggle button named after the item', async () => {
    render(<CompareButton item={item} />);
    const button = screen.getByRole('button', { name: 'Compare Claymore' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(compareStore('d1').getSnapshot().slugs).toEqual(['claymore']);
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(compareStore('d1').getSnapshot().slugs).toEqual([]);
  });

  it('the detail variant is a labelled toggle too', async () => {
    render(<CompareButton item={item} variant="detail" />);
    const button = screen.getByRole('button', { name: 'Compare Claymore' });
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('says "Compare holds up to 4. Remove one first." for a fifth item', async () => {
    for (const slug of ['a', 'b', 'c', 'd']) addToCompare(compareStore('d1'), 'weapons', slug);
    render(<CompareButton item={item} />);
    await userEvent.click(screen.getByRole('button', { name: 'Compare Claymore' }));
    expect(await screen.findByText('Compare holds up to 4.')).toBeInTheDocument();
    expect(screen.getByText('Remove one first.')).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().slugs).toEqual(['a', 'b', 'c', 'd']);
  });

  it('asks before mixing categories; the toast action starts a new comparison', async () => {
    addToCompare(compareStore('d1'), 'armor', 'x');
    render(<CompareButton item={item} />);
    await userEvent.click(screen.getByRole('button', { name: 'Compare Claymore' }));
    expect(await screen.findByText('You are comparing Armor.')).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().category).toBe('armor');
    await userEvent.click(screen.getByRole('button', { name: 'Start a new comparison' }));
    expect(compareStore('d1').getSnapshot()).toEqual({ category: 'weapons', slugs: ['claymore'] });
  });

  it('renders nothing for the D1 DLCs', () => {
    render(<CompareButton item={{ ...item, category: 'dlcs' }} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('CompareTray', () => {
  beforeEach(() => clearCompare(compareStore('d1')));
  const items = ENTRIES.map((e) => ({ slug: e.s, name: e.n, rarity: e.r }));

  it('renders nothing without a selection, or for another category', () => {
    const { container } = render(<CompareTray game="d1" category="weapons" items={items} />);
    expect(container.querySelector('[data-testid="compare-tray"]')).toBeNull();
    addToCompare(compareStore('d1'), 'armor', 'x');
    expect(container.querySelector('[data-testid="compare-tray"]')).toBeNull();
  });

  it('shows the selection with a count, a Compare link and Clear', async () => {
    addToCompare(compareStore('d1'), 'weapons', 'claymore');
    addToCompare(compareStore('d1'), 'weapons', 'katana');
    render(<CompareTray game="d1" category="weapons" items={items} />);
    const tray = screen.getByRole('region', { name: 'Compare tray' });
    expect(within(tray).getByRole('status')).toHaveTextContent('2/4 selected');
    expect(within(tray).getByRole('link', { name: 'Compare' })).toHaveAttribute(
      'href',
      '/d1/compare?c=weapons&items=claymore,katana',
    );
    await userEvent.click(
      within(tray).getByRole('button', { name: 'Remove Claymore from comparison' }),
    );
    expect(within(tray).getByRole('status')).toHaveTextContent('1/4 selected');
    await userEvent.click(within(tray).getByRole('button', { name: 'Clear' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Compare tray' })).toBeNull());
    expect(compareStore('d1').getSnapshot().slugs).toEqual([]);
  });

  it('builds the compare URL', () => {
    expect(compareHref('d2', 'armor', ['a', 'b'])).toBe('/d2/compare?c=armor&items=a,b');
  });
});

describe('CompareView', () => {
  const categories: CompareCategory[] = [
    { slug: 'weapons', label: 'Weapons', rows: ROWS },
    { slug: 'armor', label: 'Armor', rows: [] },
  ];

  function setup(searchParams = '') {
    const onUrlUpdate = vi.fn();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ENTRIES)));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <NuqsTestingAdapter searchParams={searchParams} onUrlUpdate={onUrlUpdate} hasMemory>
        <CompareView game="d1" categories={categories} />
      </NuqsTestingAdapter>,
    );
    return { onUrlUpdate, fetchMock };
  }

  beforeEach(() => {
    resetCompareCache();
    clearCompare(compareStore('d1'));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('asks for a category when there is no c and nothing stored', async () => {
    const { fetchMock } = setup();
    expect(await screen.findByText('Pick something to compare')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Category to compare' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reads the selection from the URL and fetches that category’s file', async () => {
    const { fetchMock } = setup('?c=weapons&items=claymore,katana');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/compare/d1/weapons.json');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.queryByRole('combobox', { name: 'Category to compare' })).toBeNull();
  });

  it('falls back to the stored selection', async () => {
    addToCompare(compareStore('d1'), 'weapons', 'claymore');
    addToCompare(compareStore('d1'), 'weapons', 'daggers');
    setup();
    expect(await screen.findByRole('link', { name: 'Daggers' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Claymore' })).toBeInTheDocument();
  });

  it('shows an empty state with links when fewer than two items are selected', async () => {
    setup('?c=weapons&items=claymore');
    expect(await screen.findByText('Add one more to compare')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Weapons' })).toHaveAttribute(
      'href',
      '/d1/weapons',
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('leaves out slugs the category does not have, and says so', async () => {
    setup('?c=weapons&items=claymore,katana,nope');
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent(
      '1 item from this link is not in the Weapons list',
    );
  });

  it('removing an item updates the URL and the stored selection', async () => {
    const { onUrlUpdate } = setup('?c=weapons&items=claymore,katana,daggers');
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Katana from comparison' }));
    await waitFor(() =>
      expect(onUrlUpdate.mock.lastCall?.[0].queryString).toBe('?c=weapons&items=claymore,daggers'),
    );
    expect(compareStore('d1').getSnapshot()).toEqual({
      category: 'weapons',
      slugs: ['claymore', 'daggers'],
    });
  });

  it('Differences only goes to the URL and hides identical rows', async () => {
    const { onUrlUpdate } = setup('?c=weapons&items=claymore,katana');
    await screen.findByRole('table');
    expect(screen.getByRole('rowheader', { name: 'Combo length' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch', { name: 'Differences only' }));
    await waitFor(() => expect(onUrlUpdate.mock.lastCall?.[0].queryString).toContain('diff=true'));
    expect(screen.queryByRole('rowheader', { name: 'Combo length' })).toBeNull();
  });

  it('Add item offers only the category’s items that are not selected yet', async () => {
    setup('?c=weapons&items=claymore,katana');
    await screen.findByRole('table');
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Daggers']);
    await userEvent.click(options[0] as HTMLElement);
    await waitFor(() => expect(screen.getAllByRole('columnheader')).toHaveLength(4));
  });

  it('disables Add item at four', async () => {
    const four: CompareEntry[] = [
      ...ENTRIES,
      { s: 'sword', n: 'Sword', v: { 'stats.damage': 5 } },
      { s: 'axe', n: 'Axe', v: {} },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(four))),
    );
    render(
      <NuqsTestingAdapter searchParams="?c=weapons&items=claymore,katana,daggers,sword" hasMemory>
        <CompareView game="d1" categories={categories} />
      </NuqsTestingAdapter>,
    );
    await screen.findByRole('table');
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
  });

  it('can retry after a failed download', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ENTRIES)));
    vi.stubGlobal('fetch', fetchMock);
    render(
      <NuqsTestingAdapter searchParams="?c=weapons&items=claymore,katana" hasMemory>
        <CompareView game="d1" categories={categories} />
      </NuqsTestingAdapter>,
    );
    expect(await screen.findByText('Could not load the comparison data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table')).toBeInTheDocument();
  });
});
