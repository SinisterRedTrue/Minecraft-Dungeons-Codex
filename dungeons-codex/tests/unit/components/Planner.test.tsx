import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BuildPlanner } from '@/components/features/planner/BuildPlanner';
import { PlannerButton } from '@/components/features/planner/PlannerButton';
import { ToastProvider } from '@/components/ui/Toast';
import type { GameId } from '@/config/games';
import { resetCatalogCache } from '@/lib/forge/catalog';
import { encodeBuild } from '@/lib/planner/codec';
import { resetPlannerCache } from '@/lib/planner/data';
import type { Build } from '@/lib/planner/schema';
import { buildsStore, draftStore, EMPTY_BUILDS, EMPTY_DRAFT } from '@/lib/planner/store';
import { d1, d2 } from '../lib/planner/real';

const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

const render = (ui: ReactElement) => rtlRender(ui, { wrapper: ToastProvider });

const reals = { d1, d2 };

function stubFetch() {
  const fetchMock = vi.fn((url: string) => {
    const game = (url.includes('/d2') ? 'd2' : 'd1') as GameId;
    const body = url.startsWith('/planner/') ? reals[game].file : reals[game].catalog;
    return Promise.resolve(new Response(JSON.stringify(body)));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function setup(game: GameId, search = '') {
  const onUrlUpdate = vi.fn();
  render(
    <NuqsTestingAdapter searchParams={search} onUrlUpdate={onUrlUpdate} hasMemory>
      <BuildPlanner game={game} />
    </NuqsTestingAdapter>,
  );
  return { onUrlUpdate };
}

const planner = () => screen.findByTestId('build-planner');
const slotCard = (key: string) => within(screen.getByTestId(`slot-${key}`));
const lastB = (onUrlUpdate: ReturnType<typeof vi.fn>) => {
  const calls = onUrlUpdate.mock.calls;
  const params = (calls.at(-1)?.[0] as { searchParams: URLSearchParams } | undefined)?.searchParams;
  return params?.get('b') ?? null;
};

beforeEach(() => {
  resetPlannerCache();
  resetCatalogCache();
  draftStore('d1').set(EMPTY_DRAFT);
  draftStore('d2').set(EMPTY_DRAFT);
  buildsStore.set(EMPTY_BUILDS);
  router.push.mockClear();
  stubFetch();
});
afterEach(() => vi.unstubAllGlobals());

describe('Build Planner', () => {
  it('shows the Dungeons slots, and the power field', async () => {
    setup('d1');
    await planner();
    for (const label of ['Melee', 'Ranged', 'Armor', 'Artifact 1', 'Artifact 2', 'Artifact 3']) {
      expect(screen.getByRole('button', { name: `Choose ${label}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Choose Helmet/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Power')).toHaveValue(100);
    expect(screen.getByText('Choose items to see what your build adds up to.')).toBeInTheDocument();
  });

  it('shows the Dungeons II slots and no power field', async () => {
    setup('d2');
    await planner();
    for (const label of [
      'Melee',
      'Ranged',
      'Helmet',
      'Chestplate',
      'Leggings',
      'Boots',
      'Artifact 3',
      'Talisman 1',
      'Talisman 3',
    ]) {
      expect(screen.getByRole('button', { name: `Choose ${label}` })).toBeInTheDocument();
    }
    expect(screen.queryByLabelText('Power')).not.toBeInTheDocument();
  });

  it('can retry after the data fails to load', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('no', { status: 503 }))
        .mockResolvedValueOnce(new Response('no', { status: 503 }))
        .mockImplementation((url: string) =>
          Promise.resolve(
            new Response(JSON.stringify(url.startsWith('/planner/') ? d1.file : d1.catalog)),
          ),
        ),
    );
    setup('d1');
    expect(await screen.findByText('Could not load the planner data')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await planner()).toBeInTheDocument();
  });

  describe('item picker', () => {
    it('lists only melee weapons for Melee and only ranged for Ranged', async () => {
      setup('d1');
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Choose Melee' }));
      const melee = await screen.findByRole('dialog', { name: 'Choose Melee' });
      expect(within(melee).getByRole('button', { name: 'Axe' })).toBeInTheDocument();
      expect(within(melee).queryByRole('button', { name: 'Ancient Bow' })).not.toBeInTheDocument();
      // The Type filter is fixed by the slot, so it is not offered; weapon types are.
      expect(within(melee).queryByRole('radio', { name: /^Ranged/ })).not.toBeInTheDocument();
      expect(within(melee).getByText(/Step 1 · Weapon type/)).toBeInTheDocument();
      await userEvent.keyboard('{Escape}');

      await userEvent.click(screen.getByRole('button', { name: 'Choose Ranged' }));
      const ranged = await screen.findByRole('dialog', { name: 'Choose Ranged' });
      expect(within(ranged).getByRole('button', { name: 'Ancient Bow' })).toBeInTheDocument();
      expect(within(ranged).queryByRole('button', { name: 'Axe' })).not.toBeInTheDocument();
    });

    it('lists only armor pieces of the slot in Dungeons II', async () => {
      setup('d2');
      await planner();
      const helmet = d2.data.items('armor').find((i) => i.slot === 'helmet');
      const boots = d2.data.items('armor').find((i) => i.slot === 'boots');
      if (!helmet || !boots) throw new Error('fixtures');
      await userEvent.click(screen.getByRole('button', { name: 'Choose Helmet' }));
      const dialog = await screen.findByRole('dialog', { name: 'Choose Helmet' });
      expect(within(dialog).getByRole('button', { name: helmet.name })).toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: boots.name })).not.toBeInTheDocument();
    });

    it('puts the chosen item into the slot and the link, and survives a filter', async () => {
      const { onUrlUpdate } = setup('d1');
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Choose Melee' }));
      const dialog = await screen.findByRole('dialog', { name: 'Choose Melee' });
      await userEvent.type(
        within(dialog).getByRole('searchbox', { name: 'Search in results' }),
        'axe',
      );
      expect(within(dialog).queryByRole('button', { name: 'Claymore' })).not.toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Axe' }));

      expect(await slotCard('melee').findByText('Axe')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      // The picker's filters stay out of the URL: only the build is in it.
      await waitFor(() => expect(lastB(onUrlUpdate)).not.toBeNull());
      const params = (onUrlUpdate.mock.calls.at(-1)?.[0] as { searchParams: URLSearchParams })
        .searchParams;
      expect([...params.keys()]).toEqual(['b']);
      // And the summary has a damage number for it.
      expect(screen.getByTestId('damage-melee')).toHaveTextContent(/\d–\d/);
    });
  });

  describe('enchantment picker', () => {
    const open = async (slotKey: string) => {
      await userEvent.click(
        within(screen.getByTestId(`slot-${slotKey}`)).getByRole('button', {
          name: /^Enchant /,
        }),
      );
      return screen.findByRole('dialog', { name: /^Enchantments/ });
    };
    const pickFrom = async (dialog: HTMLElement, index: number, name: string) => {
      await userEvent.click(within(dialog).getAllByRole('button', { name: /^Slot \d/ })[index]!);
      await userEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
    };

    it('lists only the enchantments that fit the slot (melee vs armor)', async () => {
      const build: Build = {
        game: 'd1',
        slots: {
          melee: { slug: 'axe', picks: [] },
          armor: { slug: 'battle-robe', picks: [] },
        },
      };
      setup('d1', `?b=${encodeBuild(build)}`);
      await planner();

      let dialog = await open('melee');
      await userEvent.click(within(dialog).getAllByRole('button', { name: /^Slot 1/ })[0]!);
      expect(await screen.findByRole('option', { name: /Sharpness/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Acrobat/ })).not.toBeInTheDocument();
      await userEvent.keyboard('{Escape}');
      await userEvent.keyboard('{Escape}');

      dialog = await open('armor');
      await userEvent.click(within(dialog).getAllByRole('button', { name: /^Slot 1/ })[0]!);
      expect(await screen.findByRole('option', { name: /Acrobat/ })).toBeInTheDocument();
      expect(screen.queryByRole('option', { name: /Sharpness/ })).not.toBeInTheDocument();
    });

    it('adds picks with tiers, counts points and applies Sharpness to the damage', async () => {
      const { onUrlUpdate } = setup(
        'd1',
        `?b=${encodeBuild({ game: 'd1', slots: { melee: { slug: 'axe', picks: [] } } })}`,
      );
      await planner();
      const before = screen.getByTestId('damage-melee').textContent;

      const dialog = await open('melee');
      await pickFrom(dialog, 0, 'Sharpness');
      await userEvent.click(within(dialog).getAllByRole('radio', { name: 'Tier III' })[0]!);
      await userEvent.keyboard('{Escape}');

      expect(await slotCard('melee').findByText('Sharpness III')).toBeInTheDocument();
      // Tier III costs 1 + 2 + 3 points.
      expect(screen.getByTestId('points')).toHaveTextContent('6');
      expect(screen.getByTestId('damage-melee').textContent).not.toBe(before);
      expect(screen.getByText('+33%')).toBeInTheDocument();
      expect(screen.getByText('Damage')).toBeInTheDocument();
      await waitFor(() => expect(lastB(onUrlUpdate)).not.toBeNull());
    });

    it('shows built-in enchantments locked', async () => {
      const withBuiltIn = d1.data
        .items('weapons')
        .find((i) => i.kind === 'melee' && (i.builtInEnchantments as unknown[])?.length > 0);
      if (!withBuiltIn) throw new Error('fixture');
      setup(
        'd1',
        `?b=${encodeBuild({ game: 'd1', slots: { melee: { slug: withBuiltIn.slug, picks: [] } } })}`,
      );
      await planner();
      const dialog = await open('melee');
      const builtIns = within(dialog).getByRole('list', { name: 'Built-in enchantments' });
      expect(within(builtIns).getAllByText('Built in').length).toBeGreaterThan(0);
    });

    it('gives Dungeons II gear exactly one enchantment slot', async () => {
      const piece = d2.data.items('armor').find((i) => i.slot === 'helmet');
      if (!piece) throw new Error('fixture');
      setup(
        'd2',
        `?b=${encodeBuild({ game: 'd2', slots: { helmet: { slug: piece.slug, picks: [] } } })}`,
      );
      await planner();
      const dialog = await open('helmet');
      expect(within(dialog).getAllByRole('button', { name: /^Slot \d/ })).toHaveLength(1);
    });
  });

  describe('summary', () => {
    it('warns about a duplicate artifact', async () => {
      setup(
        'd1',
        `?b=${encodeBuild({
          game: 'd1',
          slots: {
            artifact1: { slug: 'blast-fungus', picks: [] },
            artifact2: { slug: 'buzzy-nest', picks: [] },
            artifact3: { slug: 'blast-fungus', picks: [] },
          },
        })}`,
      );
      await planner();
      const warnings = screen.getByRole('list', { name: 'Warnings' });
      expect(within(warnings).getByText(/Duplicate artifact/)).toBeInTheDocument();
      expect(warnings).toHaveTextContent('Blast Fungus is in Artifact 1 and Artifact 3');
    });

    it('sums armor effects and says so', async () => {
      setup(
        'd1',
        `?b=${encodeBuild({ game: 'd1', slots: { armor: { slug: 'battle-robe', picks: [] } } })}`,
      );
      await planner();
      expect(screen.getByText('-40%')).toBeInTheDocument();
      expect(screen.getByText('Artifact Cooldown')).toBeInTheDocument();
      expect(screen.getByText(/Simple sum: in-game stacking may differ/)).toBeInTheDocument();
    });

    it('Dungeons II says what is not documented', async () => {
      setup(
        'd2',
        `?b=${encodeBuild({ game: 'd2', slots: { talisman1: { slug: 'amethyst-lens', picks: [], tier: 3 } } })}`,
      );
      await planner();
      expect(screen.getByText(/Power-level scaling numbers aren't documented/)).toBeInTheDocument();
      expect(screen.getByText('+25%')).toBeInTheDocument();
      expect(screen.queryByText('Enchantment points')).not.toBeInTheDocument();
    });

    it('marks an estimated damage as Approximate', async () => {
      setup(
        'd1',
        `?b=${encodeBuild({ game: 'd1', power: 263, slots: { melee: { slug: 'axe', picks: [] } } })}`,
      );
      await planner();
      expect(screen.getByTestId('approximate-badge')).toBeInTheDocument();
    });
  });

  describe('links', () => {
    it('explains an invalid link in a toast and falls back to the draft', async () => {
      draftStore('d1').set({
        code: encodeBuild({ game: 'd1', slots: { armor: { slug: 'battle-robe', picks: [] } } }),
      });
      const { onUrlUpdate } = setup('d1', '?b=rnot-a-build');
      expect(await screen.findByText('That build link could not be read')).toBeInTheDocument();
      expect(await slotCard('armor').findByText('Battle Robe')).toBeInTheDocument();
      await waitFor(() => expect(lastB(onUrlUpdate)).toBeNull());
    });

    it('rejects a link of the other game', async () => {
      setup('d1', `?b=${encodeBuild({ game: 'd2', slots: {} })}`);
      expect(await screen.findByText('That build link could not be read')).toBeInTheDocument();
    });

    it('drops entries the data does not have and says which', async () => {
      const code =
        'r' +
        btoa(
          JSON.stringify({ v: 1, g: 'd1', s: { melee: ['axe', []], armor: ['gone-armor', []] } }),
        );
      setup('d1', `?b=${code}`);
      expect(await screen.findByText('Some entries were left out')).toBeInTheDocument();
      expect(screen.getByText(/“gone-armor”/)).toBeInTheDocument();
      expect(await slotCard('melee').findByText('Axe')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Choose Armor' })).toBeInTheDocument();
    });

    it('copies the link', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
      const build: Build = { game: 'd1', slots: { melee: { slug: 'axe', picks: [] } } };
      setup('d1', `?b=${encodeBuild(build)}`);
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
      const url = new URL(writeText.mock.calls[0]?.[0] as string);
      expect(url.pathname).toBe('/d1/planner');
      expect(url.searchParams.get('b')).toBe(encodeBuild(build));
      expect(await screen.findByText('Link copied')).toBeInTheDocument();
    });

    it('does not copy an empty build', async () => {
      setup('d1');
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Copy link' }));
      expect(await screen.findByText('Nothing to share yet')).toBeInTheDocument();
    });
  });

  describe('actions and My builds', () => {
    const withAxe = () =>
      setup(
        'd1',
        `?b=${encodeBuild({ game: 'd1', name: 'Axe build', slots: { melee: { slug: 'axe', picks: [] } } })}`,
      );

    it('saves, lists, renames and deletes (after a confirmation)', async () => {
      withAxe();
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('Saved to My builds')).toBeInTheDocument();
      const mine = screen.getByTestId('my-builds');
      expect(within(mine).getByText('Axe build')).toBeInTheDocument();
      expect(buildsStore.getSnapshot()).toHaveLength(1);

      // Saving again updates the same build.
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(buildsStore.getSnapshot()).toHaveLength(1);

      await userEvent.click(within(mine).getByRole('button', { name: 'Rename Axe build' }));
      const rename = await screen.findByRole('dialog', { name: 'Rename build' });
      const field = within(rename).getByRole('textbox', { name: 'Name' });
      await userEvent.clear(field);
      await userEvent.type(field, 'Chopper');
      await userEvent.click(within(rename).getByRole('button', { name: 'Rename' }));
      expect(within(mine).getByText('Chopper')).toBeInTheDocument();
      expect(screen.getByLabelText('Build name')).toHaveValue('Chopper');

      await userEvent.click(within(mine).getByRole('button', { name: 'Delete Chopper' }));
      const confirm = await screen.findByRole('dialog', { name: 'Delete this build?' });
      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      expect(buildsStore.getSnapshot()).toHaveLength(1);
      await userEvent.click(within(mine).getByRole('button', { name: 'Delete Chopper' }));
      await userEvent.click(
        within(await screen.findByRole('dialog', { name: 'Delete this build?' })).getByRole(
          'button',
          {
            name: 'Delete build',
          },
        ),
      );
      expect(buildsStore.getSnapshot()).toHaveLength(0);
      expect(within(mine).getByText(/Nothing saved yet/)).toBeInTheDocument();
    });

    it('opens a saved build and copies its link', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
      withAxe();
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
      await userEvent.click(
        within(await screen.findByRole('dialog', { name: 'Clear this build?' })).getByRole(
          'button',
          {
            name: 'Clear build',
          },
        ),
      );
      expect(screen.getByRole('button', { name: 'Choose Melee' })).toBeInTheDocument();

      const mine = screen.getByTestId('my-builds');
      await userEvent.click(within(mine).getByRole('button', { name: 'Open Axe build' }));
      expect(await slotCard('melee').findByText('Axe')).toBeInTheDocument();
      await userEvent.click(within(mine).getByRole('button', { name: 'Copy link to Axe build' }));
      await waitFor(() => expect(writeText).toHaveBeenCalled());
    });

    it('duplicates into a new saved build that becomes the open one', async () => {
      withAxe();
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
      expect(await screen.findByText('Duplicated')).toBeInTheDocument();
      expect(buildsStore.getSnapshot().map((b) => b.name)).toEqual(['Axe build copy']);
      expect(screen.getByLabelText('Build name')).toHaveValue('Axe build copy');
    });

    it('asks before clearing, and clears name, items and the draft', async () => {
      withAxe();
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
      const dialog = await screen.findByRole('dialog', { name: 'Clear this build?' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(slotCard('melee').getByText('Axe')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
      await userEvent.click(
        within(await screen.findByRole('dialog', { name: 'Clear this build?' })).getByRole(
          'button',
          {
            name: 'Clear build',
          },
        ),
      );
      expect(screen.getByRole('button', { name: 'Choose Melee' })).toBeInTheDocument();
      expect(screen.getByLabelText('Build name')).toHaveValue('');
      expect(draftStore('d1').getSnapshot()).toBe(EMPTY_DRAFT);
    });

    it('refuses a 51st saved build', async () => {
      const entry = (n: number) => ({
        id: `b${n}`,
        game: 'd2' as const,
        name: `Build ${n}`,
        savedAt: '2026-11-12T10:00:00.000Z',
        code: 'rAAAA',
      });
      buildsStore.set(Array.from({ length: 50 }, (_, i) => entry(i)));
      withAxe();
      await planner();
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
      expect(await screen.findByText('My builds holds up to 50.')).toBeInTheDocument();
      expect(buildsStore.getSnapshot()).toHaveLength(50);
    });

    it('lists only the builds of this game', async () => {
      buildsStore.set([
        {
          id: 'x',
          game: 'd2',
          name: 'Elsewhere',
          savedAt: '2026-11-12T10:00:00.000Z',
          code: 'rAAAA',
        },
      ]);
      setup('d1');
      await planner();
      expect(screen.queryByText('Elsewhere')).not.toBeInTheDocument();
    });
  });

  it('starts from the draft that "Open in Planner" wrote', async () => {
    const dock = draftStore('d1');
    const { addToDraft } = await import('@/lib/planner/store');
    addToDraft(dock, 'd1', 'weapons', 'axe', { kind: 'melee' });
    setup('d1');
    await planner();
    expect(await slotCard('melee').findByText('Axe')).toBeInTheDocument();
  });
});

describe('PlannerButton', () => {
  it('puts the item in the draft and opens the planner', async () => {
    render(
      <PlannerButton
        game="d1"
        category="weapons"
        slug="axe"
        name="Axe"
        fields={{ kind: 'melee' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Open in Planner/ }));
    expect(router.push).toHaveBeenCalledWith('/d1/planner');
    expect(draftStore('d1').getSnapshot().code).not.toBe('');
  });

  it('is not shown for a category without a slot', () => {
    render(<PlannerButton game="d1" category="mobs" slug="zombie" name="Zombie" fields={{}} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
