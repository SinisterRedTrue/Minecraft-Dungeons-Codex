import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PowerForge from '@/components/features/forge/PowerForge';
import { ToastProvider } from '@/components/ui/Toast';
import { resetCatalogCache } from '@/lib/forge/catalog';
import { decodeForge, encodeForge } from '@/lib/forge/codec';
import { readCatalog } from '../../../scripts/lib/forge-catalog';
import { realForgeProps } from '../../helpers/forge';

const catalogs = {
  d1: readCatalog(process.cwd(), 'd1'),
  d2: readCatalog(process.cwd(), 'd2'),
};

function stubCatalogFetch(options: { failFirst?: boolean } = {}) {
  let failed = !options.failFirst;
  const fetchMock = vi.fn((url: string) => {
    if (!failed) {
      failed = true;
      return Promise.resolve(new Response('nope', { status: 503 }));
    }
    const game = url.includes('/d1.json') ? 'd1' : 'd2';
    return Promise.resolve(new Response(JSON.stringify(catalogs[game])));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** The numbers inside a result element, in order (each ticker keeps its final value). */
const numbers = (el: HTMLElement) =>
  Array.from(el.querySelectorAll<HTMLElement>('[data-value]')).map((n) => Number(n.dataset.value));

function setup(game: 'd1' | 'd2', category: string, slug: string) {
  const props = realForgeProps(game, category, slug);
  render(
    <ToastProvider>
      <PowerForge props={props} />
    </ToastProvider>,
  );
  return props;
}

/** The tier I / II / III switch of one slot. */
const tier = (slot: number, name: string) =>
  within(screen.getByRole('radiogroup', { name: `Slot ${slot} tier` })).getByRole('radio', {
    name,
  });

async function pick(user: ReturnType<typeof userEvent.setup>, slot: number, name: RegExp | string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^Slot ${slot}:`) }));
  await user.click(await screen.findByRole('option', { name }));
}

beforeEach(() => {
  resetCatalogCache();
  window.history.replaceState(null, '', '/d1/weapons/claymore');
});
afterEach(() => vi.unstubAllGlobals());

describe('PowerForge: Dungeons weapon with a documented table (Claymore)', () => {
  it('shows the documented damage at power 100, exact and without an Approximate badge', async () => {
    stubCatalogFetch();
    setup('d1', 'weapons', 'claymore');
    expect(numbers(await screen.findByTestId('damage-base'))).toEqual([1490, 2759]);
    expect(screen.queryByTestId('approximate-badge')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Power level')).toHaveValue(100);
  });

  it('follows the slider by keyboard and stays in sync with the number box', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    const thumb = await screen.findByRole('slider', { name: 'Power level slider' });
    thumb.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByLabelText('Power level')).toHaveValue(101);
    const [min, max] = numbers(screen.getByTestId('damage-base'));
    expect(min).toBeGreaterThan(1490);
    expect(max).toBeGreaterThan(2759);
    expect(max).toBeLessThan(3383); // the power-105 row
    await user.keyboard('{End}');
    expect(screen.getByLabelText('Power level')).toHaveValue(263);
  });

  it('typing a power moves the slider, and past the table the number turns Approximate', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    const box = await screen.findByLabelText('Power level');
    await user.clear(box);
    await user.type(box, '250');
    expect(screen.getByRole('slider', { name: 'Power level slider' })).toHaveAttribute(
      'aria-valuenow',
      '250',
    );
    const badge = screen.getByTestId('approximate-badge');
    await user.click(badge);
    expect(await screen.findByText(/outside the item's documented table/)).toBeInTheDocument();
  });

  it('jumps to a documented cap with its button', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await user.click(await screen.findByRole('button', { name: '263' }));
    expect(screen.getByLabelText('Power level')).toHaveValue(263);
  });
});

describe('PowerForge: enchantments', () => {
  it('adding Sharpness III raises the damage by 33% and costs 1 + 2 + 3 points', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Sharpness/);
    await user.click(tier(1, 'Tier III'));
    const boosted = await screen.findByTestId('damage-boosted');
    const [min, max] = numbers(boosted);
    expect(min).toBeCloseTo(1490 * 1.33, 6);
    expect(max).toBeCloseTo(2759 * 1.33, 6);
    expect(within(boosted.parentElement as HTMLElement).getByText('+33%')).toBeInTheDocument();
    expect(numbers(screen.getByTestId('forge-points'))).toEqual([6]);
    expect(screen.getByText('In the number above')).toBeInTheDocument();
  });

  it('only offers enchantments that fit the item, and none twice', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Sharpness/);
    await user.click(screen.getByRole('button', { name: /^Slot 2:/ }));
    expect(screen.queryByRole('option', { name: /^Power/ })).not.toBeInTheDocument(); // ranged only
    expect(screen.getByRole('option', { name: /^Sharpness/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('option', { name: /^Smiting/ })).toBeInTheDocument();
  });

  it('lists a conditional enchantment (Smiting) without changing the main number', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Smiting/);
    const lines = await screen.findByTestId('forge-lines');
    expect(within(lines).getByText('Situational')).toBeInTheDocument();
    expect(within(lines).getByText('+25% increased damage')).toBeInTheDocument();
    expect(screen.queryByTestId('damage-boosted')).not.toBeInTheDocument();
    expect(numbers(screen.getByTestId('damage-base'))).toEqual([1490, 2759]);
  });

  it('can remove a pick again', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Sharpness/);
    expect(await screen.findByTestId('damage-boosted')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove Sharpness' }));
    expect(screen.queryByTestId('damage-boosted')).not.toBeInTheDocument();
    expect(numbers(screen.getByTestId('forge-points'))).toEqual([0]);
  });

  it('shows built-in enchantments locked: linked, labelled, with no way to remove them', async () => {
    stubCatalogFetch();
    setup('d1', 'weapons', 'anchor');
    const list = await screen.findByRole('list', { name: 'Built-in enchantments' });
    expect(within(list).getByRole('link', { name: 'Gravity' })).toHaveAttribute(
      'href',
      '/d1/enchantments/gravity',
    );
    expect(within(list).getByText('Built in')).toBeInTheDocument();
    expect(within(list).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Remove Gravity/ })).not.toBeInTheDocument();
  });
});

describe('PowerForge: an item without a documented table', () => {
  it('estimates from its rating and says so', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'obsidian-claymore');
    const [min] = numbers(await screen.findByTestId('damage-base'));
    expect(min).toBeGreaterThan(0);
    await user.click(screen.getByTestId('approximate-badge'));
    expect(await screen.findByText(/damage rating/)).toBeInTheDocument();
  });
});

describe('PowerForge: armor', () => {
  it('shows damage reduction, bonus health and effects, and no damage number', async () => {
    stubCatalogFetch();
    setup('d1', 'armor', 'champions-armor');
    const [min, max] = numbers(await screen.findByTestId('health-base'));
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(min ?? Infinity);
    expect(screen.getByText('Damage reduction')).toBeInTheDocument();
    expect(screen.getByText(/35%/)).toBeInTheDocument();
    expect(screen.getByText('does not change with power')).toBeInTheDocument();
    expect(screen.queryByTestId('damage-base')).not.toBeInTheDocument();
    expect(screen.queryByTestId('approximate-badge')).not.toBeInTheDocument(); // power 100 is documented
  });
});

describe('PowerForge: Dungeons II', () => {
  it('has no power slider, one enchantment slot and the honest note', async () => {
    window.history.replaceState(null, '', '/d2/weapons/twilight-dagger');
    stubCatalogFetch();
    setup('d2', 'weapons', 'twilight-dagger');
    expect(await screen.findByTestId('d2-note')).toHaveTextContent(
      "Power-level scaling numbers aren't documented on the wiki yet, so only effect tiers are shown.",
    );
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.queryByTestId('damage-base')).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^Slot 1:/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Slot 2:/ })).not.toBeInTheDocument();
  });
});

describe('PowerForge: share, restore and reset', () => {
  async function shareLink(user: ReturnType<typeof userEvent.setup>) {
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (text: string) => {
          copied = text;
          return Promise.resolve();
        },
      },
    });
    await user.click(screen.getByRole('button', { name: 'Share' }));
    await waitFor(() => expect(copied).not.toBe(''));
    return copied;
  }

  it('copies a link that round-trips power, enchantments and tiers', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Sharpness/);
    await user.click(tier(1, 'Tier II'));
    await pick(user, 2, /^Smiting/);
    const box = screen.getByLabelText('Power level');
    await user.clear(box);
    await user.type(box, '77');

    const link = await shareLink(user);
    const url = new URL(link);
    expect(url.pathname).toBe('/d1/weapons/claymore');
    expect(decodeForge(url.searchParams.get('forge'))).toEqual({
      power: 77,
      picks: [
        { slug: 'sharpness', tier: 2 },
        { slug: 'smiting', tier: 1 },
      ],
    });
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('restores the setup from a ?forge= link, ignoring enchantments that do not fit', async () => {
    window.history.replaceState(
      null,
      '',
      `/d1/weapons/claymore?forge=${encodeForge({
        power: 42,
        picks: [
          { slug: 'sharpness', tier: 3 },
          { slug: 'power', tier: 1 }, // ranged only: dropped
          { slug: 'no-such-thing', tier: 2 },
        ],
      })}`,
    );
    stubCatalogFetch();
    setup('d1', 'weapons', 'claymore');
    expect(await screen.findByRole('button', { name: 'Slot 1: Sharpness' })).toBeInTheDocument();
    expect(screen.getByLabelText('Power level')).toHaveValue(42);
    expect(tier(1, 'Tier III')).toBeChecked();
    expect(screen.getByRole('button', { name: /^Slot 2: Add/ })).toBeInTheDocument();
  });

  it('ignores a mangled link and starts from the defaults', async () => {
    window.history.replaceState(null, '', '/d1/weapons/claymore?forge=%%%garbage');
    stubCatalogFetch();
    setup('d1', 'weapons', 'claymore');
    expect(await screen.findByRole('button', { name: /^Slot 1: Add/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Power level')).toHaveValue(100);
  });

  it('Reset clears the picks, restores power 100 and cleans the address', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    await pick(user, 1, /^Sharpness/);
    await shareLink(user);
    expect(window.location.search).toContain('forge=');
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByRole('button', { name: /^Slot 1: Add/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Power level')).toHaveValue(100);
    expect(window.location.search).toBe('');
  });

  it('says so when the clipboard is not available', async () => {
    stubCatalogFetch();
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('denied')) },
    });
    await user.click(await screen.findByRole('button', { name: 'Share' }));
    expect(await screen.findByText('Could not copy the link')).toBeInTheDocument();
  });
});

describe('PowerForge: catalog loading', () => {
  it('shows a skeleton first, then offers a retry after a failed load', async () => {
    stubCatalogFetch({ failFirst: true });
    const user = userEvent.setup();
    setup('d1', 'weapons', 'claymore');
    expect(screen.getByRole('status', { name: 'Loading enchantments' })).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: /^Slot 1:/ })).toBeInTheDocument();
  });
});
