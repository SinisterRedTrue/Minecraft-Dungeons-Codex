import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackupMenu } from '@/components/features/favorites/BackupMenu';
import { FavoriteButton } from '@/components/features/favorites/FavoriteButton';
import { FavoritesView } from '@/components/features/favorites/FavoritesView';
import { ToastProvider } from '@/components/ui/Toast';
import { favoritesStore, importFavorites, toggleFavorite } from '@/lib/favorites/store';
import { resetSearchCache } from '@/lib/search/loadIndex';
import { realEntries } from '../helpers/search';

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ToastProvider });

const d1 = realEntries('d1');
const d2 = realEntries('d2');

function stubIndex() {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(new Response(JSON.stringify(url.includes('/d1.json') ? d1 : d2))),
    ),
  );
}

const CLAYMORE = 'd1:weapons:claymore';
const HATCHET = 'd2:weapons:hunters-hatchet';

beforeEach(() => {
  resetSearchCache();
  importFavorites([], 'replace');
  // jsdom's File has no .text(); browsers do.
  File.prototype.text ??= function text(this: File) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(this);
    });
  };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('FavoriteButton', () => {
  it('is a toggle button named after the item and persists', async () => {
    render(<FavoriteButton id={CLAYMORE} name="Claymore" />);
    const button = screen.getByRole('button', { name: 'Favorite Claymore' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(localStorage.getItem('dc:favorites:v1') ?? '[]')).toEqual([CLAYMORE]);
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('dc:favorites:v1')).toBeNull();
  });

  it('the detail variant has the same name and state, and several buttons stay in step', async () => {
    render(
      <>
        <FavoriteButton id={CLAYMORE} name="Claymore" />
        <FavoriteButton id={CLAYMORE} name="Claymore" variant="detail" />
      </>,
    );
    const [card, detail] = screen.getAllByRole('button', { name: 'Favorite Claymore' });
    await userEvent.click(detail as HTMLElement);
    expect(card).toHaveAttribute('aria-pressed', 'true');
    expect(detail).toHaveAttribute('aria-pressed', 'true');
  });

  it('starts "off" and follows storage written by another tab', async () => {
    render(<FavoriteButton id={CLAYMORE} name="Claymore" />);
    const button = screen.getByRole('button', { name: 'Favorite Claymore' });
    localStorage.setItem('dc:favorites:v1', JSON.stringify([CLAYMORE]));
    window.dispatchEvent(new StorageEvent('storage', { key: 'dc:favorites:v1' }));
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  });
});

describe('FavoritesView', () => {
  it('has an empty state with links to both games', async () => {
    stubIndex();
    render(<FavoritesView />);
    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Dungeons' })).toHaveAttribute('href', '/d1');
    expect(screen.getByRole('link', { name: 'Browse Dungeons II' })).toHaveAttribute('href', '/d2');
  });

  it('lists favorites by game tab and category, as the same cards', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    toggleFavorite('d1:armor:heros-armor');
    toggleFavorite(HATCHET);
    render(<FavoritesView />);
    expect(await screen.findByRole('link', { name: 'Claymore' })).toHaveAttribute(
      'href',
      '/d1/weapons/claymore',
    );
    expect(screen.getByRole('tab', { name: /Dungeons 2/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /Dungeons II 1/ })).toBeInTheDocument();
    const weapons = screen.getByRole('region', { name: 'Weapons' });
    expect(within(weapons).getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Armor' })).toBeInTheDocument();
    expect(screen.getByText(/3/, { selector: 'span.font-pixel' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('tab', { name: /Dungeons II/ }));
    expect(await screen.findByRole('link', { name: "Hunter's Hatchet" })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Claymore' })).toBeNull();
  });

  it('opens on Dungeons II when only that game has favorites', async () => {
    stubIndex();
    toggleFavorite(HATCHET);
    render(<FavoritesView />);
    expect(await screen.findByRole('link', { name: "Hunter's Hatchet" })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Dungeons II/, selected: true })).toBeInTheDocument();
  });

  it('the ★ on a card removes it from the page', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    render(<FavoritesView />);
    await screen.findByRole('link', { name: 'Claymore' });
    await userEvent.click(screen.getByRole('button', { name: 'Favorite Claymore' }));
    expect(await screen.findByText('No favorites yet')).toBeInTheDocument();
  });

  it('offers to remove a saved id that is no longer in the data', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    toggleFavorite('d1:weapons:removed-by-the-wiki');
    render(<FavoritesView />);
    await screen.findByRole('link', { name: 'Claymore' });
    const note = screen.getByRole('region', { name: 'Items no longer in the data' });
    expect(note).toHaveTextContent('1 saved item is no longer in the data');
    await userEvent.click(within(note).getByRole('button', { name: 'Remove it' }));
    expect(favoritesStore.getSnapshot()).toEqual([CLAYMORE]);
  });

  it('can retry when the item list does not download', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('x', { status: 503 }))
      .mockResolvedValue(new Response(JSON.stringify(d1)));
    vi.stubGlobal('fetch', fetchMock);
    toggleFavorite(CLAYMORE);
    render(<FavoritesView />);
    expect(await screen.findByText('Could not load your favorites')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: 'Claymore' })).toBeInTheDocument();
  });
});

describe('BackupMenu', () => {
  const file = (content: string) =>
    new File([content], 'dungeons-codex-favorites.json', { type: 'application/json' });
  const upload = (content: string) =>
    userEvent.upload(screen.getByLabelText('Import favorites file'), file(content));

  it('exports the list as dungeons-codex-favorites.json', async () => {
    toggleFavorite(CLAYMORE);
    const blobs: Blob[] = [];
    URL.createObjectURL = vi.fn((blob: Blob | MediaSource) => {
      blobs.push(blob as Blob);
      return 'blob:test';
    });
    URL.revokeObjectURL = vi.fn();
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      expect(this.download).toBe('dungeons-codex-favorites.json');
    });
    render(<BackupMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Backup' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Export JSON' }));
    expect(download).toHaveBeenCalledTimes(1);
    expect(JSON.parse(await blobs[0]!.text())).toEqual({ version: 1, favorites: [CLAYMORE] });
  });

  it('disables Export when there is nothing to export', async () => {
    render(<BackupMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Backup' }));
    expect(await screen.findByRole('button', { name: 'Export JSON' })).toBeDisabled();
  });

  it('imports a file: asks Merge or Replace, then applies it', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    render(<BackupMenu />);
    await upload(JSON.stringify({ version: 1, favorites: [HATCHET, 'd1:weapons:no-such-thing'] }));
    const dialog = await screen.findByRole('dialog', { name: 'Import favorites' });
    expect(dialog).toHaveTextContent('1 item found in the file');
    expect(dialog).toHaveTextContent('1 not in the current data were skipped');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Merge' }));
    expect(favoritesStore.getSnapshot()).toEqual([CLAYMORE, HATCHET]);
    expect(await screen.findByText('Favorites merged')).toBeInTheDocument();
  });

  it('Replace swaps the list, and a bare id list is accepted', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    render(<BackupMenu />);
    await upload(JSON.stringify([HATCHET]));
    await userEvent.click(await screen.findByRole('button', { name: 'Replace' }));
    expect(favoritesStore.getSnapshot()).toEqual([HATCHET]);
  });

  it('Cancel changes nothing', async () => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    render(<BackupMenu />);
    await upload(JSON.stringify([HATCHET]));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    expect(favoritesStore.getSnapshot()).toEqual([CLAYMORE]);
  });

  it.each([
    ['not JSON', '{nope'],
    ['the wrong version', JSON.stringify({ version: 2, favorites: [] })],
    ['bad ids', JSON.stringify({ version: 1, favorites: ['not an id'] })],
    ['a different shape', JSON.stringify({ hello: 'world' })],
  ])('rejects a file that is %s with a message, and changes nothing', async (_name, content) => {
    stubIndex();
    toggleFavorite(CLAYMORE);
    render(<BackupMenu />);
    await upload(content);
    expect(await screen.findByText('That file is not a favorites backup')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(favoritesStore.getSnapshot()).toEqual([CLAYMORE]);
  });

  it('still imports when the item list cannot be loaded (nothing is skipped)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    );
    render(<BackupMenu />);
    await upload(JSON.stringify([HATCHET]));
    const dialog = await screen.findByRole('dialog', { name: 'Import favorites' });
    expect(dialog).toHaveTextContent('1 item found in the file');
    expect(dialog).not.toHaveTextContent('skipped');
  });
});
