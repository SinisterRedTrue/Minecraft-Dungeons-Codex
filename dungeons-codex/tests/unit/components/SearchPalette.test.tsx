import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SearchPalette } from '@/components/features/search/SearchPalette';
import { addToCompare, clearCompare, compareStore } from '@/lib/compare/store';
import { resetSearchCache } from '@/lib/search/loadIndex';
import { addRecent, getRecent } from '@/lib/search/recent';
import { realEntries } from '../helpers/search';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const d1 = realEntries('d1');
const d2 = realEntries('d2');

function stubFetch(options: { failFirst?: boolean } = {}) {
  let failed = !options.failFirst;
  const fetchMock = vi.fn((url: string) => {
    if (!failed) {
      failed = true;
      return Promise.resolve(new Response('nope', { status: 503 }));
    }
    const body = url.includes('/d1.json') ? d1 : d2;
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function setup(props: { currentGame?: 'd1' | 'd2' } = {}) {
  const onOpenChange = vi.fn();
  const { unmount } = render(<SearchPalette open onOpenChange={onOpenChange} {...props} />);
  return {
    unmount,
    onOpenChange,
    input: () => screen.getByRole('combobox', { name: 'Search the Codex' }),
  };
}

beforeEach(() => {
  resetSearchCache();
  push.mockReset();
  clearCompare(compareStore('d1'));
});
afterEach(() => vi.unstubAllGlobals());

describe('SearchPalette', () => {
  it('is a named dialog with a focused search box, and shows a loading state first', async () => {
    stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    expect(screen.getByRole('dialog', { name: 'Search the Codex' })).toBeInTheDocument();
    expect(input()).toHaveFocus();
    expect(screen.getByText('Loading search…')).toBeInTheDocument();
    await screen.findByText('Jump to');
    expect(screen.queryByText('Loading search…')).toBeNull();
  });

  it('with no query offers Jump to for the 8 sections of the current game', async () => {
    stubFetch();
    setup({ currentGame: 'd2' });
    const group = await screen.findByRole('group', { name: 'Jump to' });
    const rows = within(group).getAllByRole('option');
    expect(
      rows.map((r) => within(r).getByText(/^[A-Z]/, { selector: 'span.font-bold' }).textContent),
    ).toEqual([
      'Weapons',
      'Armor',
      'Enchantments',
      'Artifacts',
      'Talismans',
      'Quests',
      'Mobs',
      'Locations',
    ]);
    await userEvent.click(rows[4]!);
    expect(push).toHaveBeenCalledWith('/d2/talismans');
  });

  it('on a neutral page offers the two game hubs and only "both games" scope', async () => {
    stubFetch();
    setup();
    const group = await screen.findByRole('group', { name: 'Jump to' });
    expect(within(group).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('group', { name: 'Search scope' })).toBeNull();
  });

  it('shows the recent items first, newest at the top', async () => {
    stubFetch();
    addRecent(d1.find((e) => e.s === 'claymore')!);
    addRecent(d2.find((e) => e.s === 'hunters-hatchet')!);
    setup({ currentGame: 'd1' });
    const recent = await screen.findByRole('group', { name: 'Recent' });
    const names = within(recent)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(names[0]).toContain("Hunter's Hatchet");
    expect(names[1]).toContain('Claymore');
  });

  it('finds results grouped by category with a game badge, and opens one with Enter', async () => {
    stubFetch();
    const { input, onOpenChange } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'clay');
    const group = await screen.findByRole('group', { name: 'Weapons' });
    const first = within(group).getAllByRole('option')[0]!;
    expect(first).toHaveTextContent('Claymore');
    expect(first).toHaveTextContent('Weapons');
    expect(within(first).getByLabelText('Minecraft Dungeons')).toHaveTextContent('D1');
    await waitFor(() =>
      expect(
        within(screen.getByRole('group', { name: 'Weapons' })).getAllByRole('option')[0],
      ).toHaveAttribute('aria-selected', 'true'),
    );
    await userEvent.keyboard('{Enter}');
    expect(push).toHaveBeenCalledWith('/d1/weapons/claymore');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(getRecent()[0]?.id).toBe('d1:weapons:claymore');
  });

  it('moves with the arrow keys and wraps around', async () => {
    stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'hunters');
    await screen.findByRole('option', { name: /Hunter's Armor/ });
    const options = () => screen.getAllByRole('option');
    expect(options()[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(options()[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(options().at(-1)).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Enter}');
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Enter adds the highlighted item to Compare and keeps the palette open', async () => {
    stubFetch();
    const { input, onOpenChange } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'clay');
    await screen.findByRole('group', { name: 'Weapons' });
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(push).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(compareStore('d1').getSnapshot()).toEqual({ category: 'weapons', slugs: ['claymore'] });
    expect(screen.getByText('Claymore added to Compare')).toBeInTheDocument();
    expect(screen.getByText('1 of 4 selected')).toBeInTheDocument();
    // Again: nothing changes, and it says so.
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText('Claymore is already in Compare')).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().slugs).toEqual(['claymore']);
  });

  it('Ctrl+Enter also works on a Recent row, and ⌘+Enter counts too', async () => {
    stubFetch();
    addRecent(d1.find((e) => e.s === 'claymore')!);
    setup({ currentGame: 'd1' });
    await screen.findByRole('group', { name: 'Recent' });
    await userEvent.keyboard('{Meta>}{Enter}{/Meta}');
    expect(compareStore('d1').getSnapshot().slugs).toEqual(['claymore']);
  });

  it('refuses a fifth item and offers a new comparison for another category', async () => {
    stubFetch();
    for (const slug of ['a', 'b', 'c', 'd']) addToCompare(compareStore('d1'), 'weapons', slug);
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'clay');
    await screen.findByRole('group', { name: 'Weapons' });
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText('Compare holds up to 4.')).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().slugs).toEqual(['a', 'b', 'c', 'd']);

    clearCompare(compareStore('d1'));
    addToCompare(compareStore('d1'), 'armor', 'x');
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText('You are comparing Armor.')).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().category).toBe('armor');
    await userEvent.click(screen.getByRole('button', { name: 'Start a new comparison' }));
    expect(compareStore('d1').getSnapshot()).toEqual({ category: 'weapons', slugs: ['claymore'] });
  });

  it('says so when the highlighted row cannot be compared (a section) or is a DLC', async () => {
    stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.keyboard('{Control>}{Enter}{/Control}'); // "Jump to" row: a section
    expect(screen.getByText('Highlight an item first')).toBeInTheDocument();
    await userEvent.type(input(), 'flames of the nether');
    await screen.findByRole('group', { name: 'DLCs' });
    await userEvent.keyboard('{Control>}{Enter}{/Control}');
    expect(screen.getByText(/cannot be compared/)).toBeInTheDocument();
    expect(compareStore('d1').getSnapshot().slugs).toEqual([]);
  });

  it('shows the Ctrl+Enter hint in the footer', async () => {
    stubFetch();
    setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    expect(screen.getByText('Ctrl ↵ add to compare')).toBeInTheDocument();
  });

  it('switches scope: This game only searches that game, Both games adds the other', async () => {
    const fetchMock = stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    expect(screen.getByRole('button', { name: /This game/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1); // only d1 is downloaded for "This game"
    await userEvent.type(input(), 'hunters hatchet');
    await screen.findByText('Nothing found');
    await userEvent.click(screen.getByRole('button', { name: 'Both games' }));
    expect(await screen.findByRole('option', { name: /Hunter's Hatchet/ })).toHaveTextContent('D2');
    expect(screen.getByRole('group', { name: /Weapons · D2/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole('button', { name: /This game/ }));
    await screen.findByText('Nothing found');
  });

  it('the empty state can widen the search to both games', async () => {
    stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'hunters hatchet');
    await userEvent.click(await screen.findByRole('button', { name: 'Search both games' }));
    expect(await screen.findByRole('option', { name: /Hunter's Hatchet/ })).toBeInTheDocument();
  });

  it('announces the number of results to assistive tech', async () => {
    stubFetch();
    const { input } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.type(input(), 'clay');
    await waitFor(() => expect(screen.getByRole('status', { hidden: true })).toBeDefined());
    await waitFor(() => expect(screen.getByText(/^\d+ results?$/)).toBeInTheDocument());
    await userEvent.clear(input());
    await userEvent.type(input(), 'zzzzqx');
    await waitFor(() => expect(screen.getByText('No results')).toBeInTheDocument());
  });

  it('shows an error with a retry when the index cannot be fetched', async () => {
    const fetchMock = stubFetch({ failFirst: true });
    setup({ currentGame: 'd1' });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Search could not load');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    await screen.findByText('Jump to');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('closes with Escape and with the close button', async () => {
    stubFetch();
    const { onOpenChange } = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    await userEvent.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
    onOpenChange.mockClear();
    await userEvent.click(screen.getByRole('button', { name: 'Close search' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('is ready on the first render when the index was already loaded', async () => {
    stubFetch();
    const first = setup({ currentGame: 'd1' });
    await screen.findByText('Jump to');
    first.unmount();
    render(<SearchPalette open onOpenChange={() => {}} currentGame="d1" />);
    expect(screen.queryByText('Loading search…')).toBeNull();
    expect(screen.getByText('Jump to')).toBeInTheDocument();
  });
});
