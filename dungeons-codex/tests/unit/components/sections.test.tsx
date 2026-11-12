import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Infobox } from '@/components/entity/Infobox';
import { PrevNext } from '@/components/entity/PrevNext';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { SourceCredit } from '@/components/entity/SourceCredit';
import { ArmorSetSection } from '@/components/entity/sections/ArmorSetSection';
import { BuiltInEnchantmentsSection } from '@/components/entity/sections/BuiltInEnchantmentsSection';
import { DetailSection } from '@/components/entity/sections/DetailSection';
import { DlcContentsSection } from '@/components/entity/sections/DlcContentsSection';
import { EffectsSection } from '@/components/entity/sections/EffectsSection';
import { EnchantmentTiersTable } from '@/components/entity/sections/EnchantmentTiersTable';
import { LinkedGridSection } from '@/components/entity/sections/LinkedGridSection';
import { MobAttacksSection } from '@/components/entity/sections/MobAttacksSection';
import { ObtainingSection } from '@/components/entity/sections/ObtainingSection';
import { PropertiesSection } from '@/components/entity/sections/PropertiesSection';
import { QuestRewardsSection } from '@/components/entity/sections/QuestRewardsSection';
import { QuestStorySection } from '@/components/entity/sections/QuestStorySection';
import { StatsSection } from '@/components/entity/sections/StatsSection';
import { TalismanTiers } from '@/components/entity/sections/TalismanTiers';
import { VariantsSection } from '@/components/entity/sections/VariantsSection';
import { WhereToFindSection } from '@/components/entity/sections/WhereToFindSection';
import type { DetailData } from '@/lib/detail/context';
import type { EntityRef, Refs } from '@/lib/detail/refs';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const mk = (category: string, slug: string, name: string, rarity?: string): EntityRef => ({
  id: `d1:${category}:${slug}`,
  game: 'd1',
  category,
  slug,
  name,
  href: `/d1/${category}/${slug}`,
  ...(rarity ? { rarity } : {}),
});
const woods = mk('locations', 'creeper-woods', 'Creeper Woods');
const sharp = mk('enchantments', 'sharpness', 'Sharpness');
const refs: Refs = { [woods.id]: woods, [sharp.id]: sharp };

describe('StatsSection', () => {
  it('renders a meter per stat and nothing without stats', () => {
    const { container, rerender } = render(
      <StatsSection stats={[{ label: 'Damage', value: 7, max: 14 }]} />,
    );
    expect(screen.getByRole('meter', { name: 'Damage' })).toHaveAttribute('aria-valuemax', '14');
    rerender(<StatsSection stats={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('PropertiesSection', () => {
  it('lists properties, hides when empty', () => {
    const { container, rerender } = render(<PropertiesSection properties={['dual wield', ' ']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Dual wield')).toBeInTheDocument();
    rerender(<PropertiesSection properties={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EffectsSection', () => {
  it('shows the sentence, value chips and the wiki note', () => {
    const { container, rerender } = render(
      <EffectsSection
        effect="Attacks have a 70% chance to grant Strength."
        note="Unstated in game."
        values={[{ label: 'Chance to grant Strength', value: 70, unit: '%' }]}
      />,
    );
    expect(screen.getByText(/70% chance to grant strength/i)).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Effect values' })).toHaveTextContent('70%');
    expect(screen.getByText(/Wiki note/)).toBeInTheDocument();
    rerender(<EffectsSection />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('BuiltInEnchantmentsSection', () => {
  it('links enchantments with their level and skips unresolved ones', () => {
    const { container, rerender } = render(
      <BuiltInEnchantmentsSection
        refs={refs}
        builtIn={[{ enchantmentId: sharp.id, level: 2 }, { enchantmentId: 'd1:enchantments:gone' }]}
      />,
    );
    expect(screen.getByRole('link', { name: /Sharpness/ })).toHaveAttribute(
      'href',
      '/d1/enchantments/sharpness',
    );
    expect(screen.getByText('Level II')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    rerender(<BuiltInEnchantmentsSection refs={refs} builtIn={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('VariantsSection', () => {
  it('shows the base item of a unique, or the uniques of a base', () => {
    const base = mk('weapons', 'claymore', 'Claymore');
    const unique = mk('weapons', 'heartstealer', 'Heartstealer', 'unique');
    const r: Refs = { [base.id]: base, [unique.id]: unique };
    const { container, rerender } = render(<VariantsSection baseItemId={base.id} refs={r} />);
    expect(screen.getByRole('heading', { name: 'Base item' })).toBeInTheDocument();
    rerender(<VariantsSection variantIds={[unique.id]} refs={r} />);
    expect(screen.getByRole('heading', { name: 'Unique variants' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Heartstealer/ })).toBeInTheDocument();
    rerender(<VariantsSection variantIds={[]} refs={r} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('WhereToFindSection', () => {
  it('links resolved locations and keeps raw text as plain pills', () => {
    const { container, rerender } = render(
      <WhereToFindSection values={[woods.id, 'Secret chest (Roamroot)']} refs={refs} />,
    );
    expect(screen.getByRole('link', { name: 'Creeper Woods' })).toBeInTheDocument();
    expect(screen.getByText('Secret chest (Roamroot)').closest('a')).toBeNull();
    rerender(<WhereToFindSection values={undefined} refs={refs} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('EnchantmentTiersTable', () => {
  const levels = [
    { level: 1, text: '+10% damage' },
    { level: 2, text: '+21% damage' },
    { level: 3, text: '+33% damage' },
  ];
  it('shows tiers, costs, gilded text and badges', () => {
    render(
      <EnchantmentTiersTable
        levels={levels}
        pointCost={[1, 2, 3]}
        gildedDescription="Extra Damage"
        stackable
        mobObtainable={false}
      />,
    );
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(4);
    expect(within(rows[3] as HTMLElement).getByText('III')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Point cost' })).toBeInTheDocument();
    expect(screen.getByText('Extra Damage')).toBeInTheDocument();
    expect(screen.getByText('Stackable on one item')).toBeInTheDocument();
    expect(screen.getByText('Not found on mobs')).toBeInTheDocument();
  });
  it('drops the cost column without costs (D2) and hides without levels', () => {
    const { container, rerender } = render(<EnchantmentTiersTable levels={levels} />);
    expect(screen.queryByRole('columnheader', { name: 'Point cost' })).toBeNull();
    rerender(<EnchantmentTiersTable levels={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TalismanTiers', () => {
  it('spells out tier and metal', () => {
    const { container, rerender } = render(
      <TalismanTiers
        tiers={[
          { tier: 1, text: '10%' },
          { tier: 2, text: '15%' },
          { tier: 3, text: '25%' },
        ]}
      />,
    );
    expect(screen.getByText('Tier I · Bronze')).toBeInTheDocument();
    expect(screen.getByText('Tier III · Gold')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    rerender(<TalismanTiers tiers={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('LinkedGridSection', () => {
  it('shows tiles for resolved ids and pills for text', () => {
    const { container, rerender } = render(
      <LinkedGridSection id="drops" title="Drops" values={[sharp.id, 'Emeralds']} refs={refs} />,
    );
    expect(screen.getByRole('link', { name: /Sharpness/ })).toBeInTheDocument();
    expect(screen.getByText('Emeralds')).toBeInTheDocument();
    rerender(<LinkedGridSection id="drops" title="Drops" values={[]} refs={refs} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DlcContentsSection', () => {
  it('renders one grid per non-empty group', () => {
    const { container, rerender } = render(
      <DlcContentsSection
        groups={[
          { category: 'weapons', label: 'Weapons', items: [mk('weapons', 'a', 'Axe A')] },
          { category: 'armor', label: 'Armor', items: [] },
        ]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Weapons (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Armor/ })).toBeNull();
    rerender(<DlcContentsSection groups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('MobAttacksSection / ObtainingSection', () => {
  it('lists attacks and hides when empty', () => {
    const { container, rerender } = render(<MobAttacksSection attacks={['Basic attack']} />);
    expect(screen.getByText('Basic attack')).toBeInTheDocument();
    rerender(<MobAttacksSection attacks={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('spells out where a cosmetic comes from', () => {
    const { container, rerender } = render(
      <ObtainingSection obtainedFrom="Seasonal Adventure" season="Luminous Night" refs={refs} />,
    );
    expect(screen.getByText('Seasonal Adventure · Luminous Night')).toBeInTheDocument();
    rerender(<ObtainingSection obtaining={[woods.id]} refs={refs} />);
    expect(screen.getByRole('link', { name: 'Creeper Woods' })).toBeInTheDocument();
    rerender(<ObtainingSection refs={refs} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Quest sections', () => {
  it('orders first / subsequent rewards and lists random pools', () => {
    const { container, rerender } = render(
      <QuestRewardsSection
        refs={refs}
        rewards={[
          { when: 'subsequent', xp: 100, items: [] },
          {
            when: 'first',
            xp: 550,
            items: [sharp.id],
            randomFrom: [
              { text: 'Random piece of Oracle Armor', count: 1, from: [woods.id, 'Oracle Crown'] },
            ],
          },
        ]}
      />,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['First completion', 'Subsequent completions']);
    expect(screen.getByText('Random piece of Oracle Armor')).toBeInTheDocument();
    expect(screen.getByText('(1 of 2)')).toBeInTheDocument();
    rerender(<QuestRewardsSection refs={refs} rewards={[{ when: 'always', items: [] }]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the story position with neighbours', () => {
    const { container, rerender } = render(
      <QuestStorySection
        order={{
          position: 2,
          total: 15,
          previous: mk('quests', 'a', 'First'),
          next: mk('quests', 'c', 'Third'),
        }}
      />,
    );
    expect(screen.getByRole('link', { name: /Previous quest/ })).toHaveAttribute(
      'href',
      '/d1/quests/a',
    );
    expect(screen.getByRole('link', { name: /Next quest/ })).toHaveAttribute(
      'href',
      '/d1/quests/c',
    );
    rerender(<QuestStorySection order={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ArmorSetSection', () => {
  it('marks the current piece and needs at least two pieces', () => {
    const pieces = [mk('armor', 'hat', 'Hat'), mk('armor', 'boots', 'Boots')];
    const { container, rerender } = render(
      <ArmorSetSection setName="Hero Armor" pieces={pieces} currentId={pieces[0]?.id ?? ''} />,
    );
    expect(screen.getByRole('heading', { name: 'Set: Hero Armor' })).toBeInTheDocument();
    expect(screen.getByTitle('This page')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    rerender(<ArmorSetSection setName="x" pieces={pieces.slice(0, 1)} currentId="" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('DetailSection', () => {
  it('renders nothing for unknown sections and for a partial entity', () => {
    const data = {
      entity: { id: 'd1:weapons:x', name: 'X', category: 'weapons' },
      refs: {},
      stats: [],
      dlcContents: [],
      setPieces: [],
      source: {},
      category: 'weapons',
    } as unknown as DetailData;
    const names = [
      'nope',
      'stats',
      'properties',
      'forge',
      'enchantments',
      'locations',
      'variants',
      'levels',
      'tiers',
      'rewards',
      'story',
      'set',
      'contents',
    ];
    for (const name of names) {
      const { container, unmount } = render(<DetailSection name={name} data={data} />);
      expect(container, name).toBeEmptyDOMElement();
      unmount();
    }
  });
});

describe('Infobox, SourceCredit, QualityBadge', () => {
  const source = {
    title: 'Dungeons:Claymore',
    url: 'https://minecraft.wiki/w/Dungeons:Claymore',
    revisionId: 42,
  };

  it('lists rows as a definition list with links', () => {
    render(
      <Infobox
        source={source}
        rows={[
          { label: 'Type', values: [{ label: 'Melee' }] },
          {
            label: 'Variants',
            values: [{ label: 'Heartstealer', href: '/d1/weapons/heartstealer' }],
          },
        ]}
      />,
    );
    expect(screen.getByText('Type').tagName).toBe('DT');
    expect(screen.getByRole('link', { name: 'Heartstealer' })).toHaveAttribute(
      'href',
      '/d1/weapons/heartstealer',
    );
    expect(screen.getByRole('link', { name: /Minecraft Wiki/ })).toHaveAttribute(
      'href',
      source.url,
    );
  });

  it('prints the full credit with the revision and the license', () => {
    render(<SourceCredit source={source} />);
    expect(screen.getByText(/Data and image from/)).toHaveTextContent('revision 42');
    expect(screen.getByRole('link', { name: 'CC BY-NC-SA 3.0' })).toHaveAttribute(
      'rel',
      expect.stringContaining('license'),
    );
  });

  it('opens a popover linking to the wiki for partial entities', async () => {
    const { container, rerender } = render(<QualityBadge quality="verified" source={source} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<QualityBadge quality="partial" source={source} />);
    await userEvent.click(screen.getByRole('button', { name: /Partial data/ }));
    expect(await screen.findByRole('link', { name: /Dungeons:Claymore/ })).toHaveAttribute(
      'href',
      source.url,
    );
  });
});

describe('PrevNext', () => {
  beforeEach(() => push.mockClear());
  const prev = mk('weapons', 'a', 'Axe');
  const next = mk('weapons', 'c', 'Cutlass');

  it('links both neighbours and jumps on [ and ]', async () => {
    render(<PrevNext prev={prev} next={next} categoryLabel="Weapons" />);
    expect(screen.getByRole('link', { name: /Previous: Axe/ })).toHaveAttribute('rel', 'prev');
    expect(screen.getByRole('link', { name: /Next: Cutlass/ })).toHaveAttribute('rel', 'next');
    await userEvent.keyboard('[[');
    expect(push).toHaveBeenLastCalledWith('/d1/weapons/a');
    await userEvent.keyboard(']');
    expect(push).toHaveBeenLastCalledWith('/d1/weapons/c');
  });

  it('ignores the shortcuts while typing or with modifiers, and at the ends', async () => {
    render(
      <>
        <input aria-label="q" />
        <PrevNext next={next} categoryLabel="Weapons" />
      </>,
    );
    await userEvent.click(screen.getByLabelText('q'));
    await userEvent.keyboard(']');
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(document.body);
    await userEvent.keyboard('{Control>}]{/Control}');
    expect(push).not.toHaveBeenCalled();
    await userEvent.keyboard('[[');
    expect(push).not.toHaveBeenCalled(); // no previous entity
    expect(screen.queryByRole('link', { name: /Previous/ })).toBeNull();
  });

  it('renders nothing when there are no neighbours', () => {
    const { container } = render(<PrevNext categoryLabel="Weapons" />);
    expect(container).toBeEmptyDOMElement();
  });
});
