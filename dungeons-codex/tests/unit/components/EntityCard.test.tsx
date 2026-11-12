import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EntityCard } from '@/components/entity/EntityCard';
import { EntityTable, firstDirection, nextSort } from '@/components/entity/EntityTable';
import { QualityBadge } from '@/components/entity/QualityBadge';
import { SourceCredit } from '@/components/entity/SourceCredit';
import { cardModel, formatField } from '@/components/entity/format';
import type { EntityListItem } from '@/lib/schemas';
import { SORT } from '../lib/filters/fixtures';

const item = {
  id: 'd1:weapons:claymore',
  game: 'd1',
  category: 'weapons',
  slug: 'claymore',
  name: 'Claymore',
  rarity: 'unique',
  quality: 'partial',
  tags: [],
  weaponType: 'claymore',
  dlc: 'flames-of-the-nether',
  stats: { damage: 11.5, speed: 1 },
  releaseDate: '2020-07-01',
  appliesTo: ['melee', 'ranged'],
  cooldownSeconds: 90,
  damageReduction: 35,
  stackable: true,
  locations: ['d1:locations:a', 'd1:locations:b'],
  image: { src: '/images/d1/weapons/claymore.webp', width: 64, height: 64, alt: 'Claymore icon' },
} as unknown as EntityListItem;

describe('formatField', () => {
  it.each([
    ['stats.damage', 'decimal', '11.5'],
    ['stats.speed', 'int', '1'],
    ['damageReduction', 'percent', '35%'],
    ['cooldownSeconds', 'seconds', '1 min 30 s'],
    ['releaseDate', 'date', 'Jul 1, 2020'],
    ['stackable', 'bool', 'Yes'],
    ['locations', 'count', '2'],
    ['rarity', 'rarity', 'Unique'],
    ['weaponType', 'label', 'Claymore'],
    ['dlc', 'label', 'Flames of the Nether'],
    ['appliesTo', 'label', 'Melee / Ranged'],
    ['name', 'text', 'Claymore'],
  ] as const)('%s as %s → %s', (field, format, expected) => {
    expect(formatField(item, field, format)).toBe(expected);
  });

  it('is undefined without a value, and falls back to raw text for odd input', () => {
    expect(formatField(item, 'missing', 'int')).toBeUndefined();
    expect(formatField({ n: 'x' }, 'n', 'decimal')).toBe('x');
    expect(formatField({ n: 'x' }, 'n', 'percent')).toBe('x');
    expect(formatField({ n: 'x' }, 'n', 'seconds')).toBe('x');
    expect(formatField({ n: 'not a date' }, 'n', 'date')).toBe('not a date');
    expect(formatField({ n: false }, 'n', 'bool')).toBe('No');
  });

  it('uses the server label map', () => {
    expect(
      formatField(item, 'weaponType', 'label', { weaponType: { claymore: 'The Claymore' } }),
    ).toBe('The Claymore');
  });
});

describe('cardModel', () => {
  it('joins the meta fields and keeps only stats that have a value', () => {
    const model = cardModel(
      item,
      [
        { label: 'DMG', field: 'stats.damage', format: 'decimal' },
        { label: 'AREA', field: 'stats.area', format: 'decimal' },
      ],
      ['weaponType', 'dlc', 'missing'],
    );
    expect(model).toEqual({
      meta: 'Claymore · Flames of the Nether',
      stats: [{ label: 'DMG', value: '11.5' }],
    });
  });

  it('formats a rarity meta field as a rarity', () => {
    expect(cardModel(item, [], ['rarity']).meta).toBe('Unique');
  });
});

describe('EntityCard', () => {
  const model = { meta: 'Claymore · DLC', stats: [{ label: 'DMG', value: '11.5' }] };

  it('is one link to the detail page, with stats and a partial badge', () => {
    render(<EntityCard item={item} model={model} />);
    const card = screen.getByRole('article');
    const links = within(card).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/d1/weapons/claymore');
    expect(within(card).getByRole('heading', { level: 3, name: 'Claymore' })).toBeInTheDocument();
    expect(within(card).getByText('Claymore · DLC')).toBeInTheDocument();
    expect(within(card).getByText('DMG')).toBeInTheDocument();
    expect(within(card).getByText('Partial')).toBeInTheDocument();
  });

  it('always lays out the corner actions slot, and renders what it is given', () => {
    const { rerender } = render(<EntityCard item={item} model={model} />);
    expect(
      screen.getByRole('article').querySelector('[data-slot="actions"]'),
    ).toBeEmptyDOMElement();
    rerender(
      <EntityCard
        item={item}
        model={model}
        actions={<button type="button" aria-label="Favorite Claymore" />}
      />,
    );
    expect(screen.getByRole('button', { name: 'Favorite Claymore' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('omits empty meta and stats', () => {
    render(<EntityCard item={{ ...item, quality: 'verified' }} model={{ meta: '', stats: [] }} />);
    expect(screen.queryByRole('definition')).not.toBeInTheDocument();
    expect(screen.queryByText('Partial')).not.toBeInTheDocument();
  });
});

describe('QualityBadge and SourceCredit', () => {
  it('QualityBadge renders only for partial entities', () => {
    const { container, rerender } = render(<QualityBadge quality="verified" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<QualityBadge quality="partial" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('SourceCredit links the wiki page and the license', () => {
    render(
      <SourceCredit
        source={{
          title: 'Claymore (Dungeons)',
          url: 'https://minecraft.wiki/w/Claymore',
          revisionId: 77,
        }}
      />,
    );
    expect(screen.getByRole('link', { name: /Minecraft Wiki: Claymore/ })).toHaveAttribute(
      'href',
      'https://minecraft.wiki/w/Claymore',
    );
    expect(screen.getByText(/revision 77/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CC BY-NC-SA 3.0' })).toHaveAttribute(
      'rel',
      'license noopener',
    );
  });
});

describe('EntityTable', () => {
  const columns = [
    { key: 'damage', label: 'Damage', field: 'stats.damage', format: 'decimal', sort: 'dmg' },
    { key: 'type', label: 'Type', field: 'weaponType', format: 'label' },
    { key: 'dlc', label: 'DLC', field: 'dlc', format: 'label', showFrom: 'lg' },
    { key: 'none', label: 'Area', field: 'stats.area', format: 'decimal' },
  ] as const;

  it('renders rows with aria-sort headers and a no-data dash', () => {
    render(
      <EntityTable
        items={[item]}
        columns={columns}
        sort={SORT}
        sortValue="dmg-desc"
        onSortChange={() => {}}
        caption="Weapons"
      />,
    );
    expect(screen.getByRole('table', { name: 'Weapons' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Damage/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );
    expect(screen.getByRole('columnheader', { name: /Name/ })).toHaveAttribute('aria-sort', 'none');
    expect(screen.getByRole('columnheader', { name: 'Type' })).not.toHaveAttribute('aria-sort');
    expect(screen.getByRole('link', { name: 'Claymore' })).toHaveAttribute(
      'href',
      '/d1/weapons/claymore',
    );
    expect(screen.getByLabelText('no data')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('clicking a sortable header asks for the next sort', async () => {
    const onSortChange = vi.fn();
    const { rerender } = render(
      <EntityTable
        items={[item]}
        columns={columns}
        sort={SORT}
        sortValue="name-asc"
        onSortChange={onSortChange}
        caption="Weapons"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Damage' }));
    expect(onSortChange).toHaveBeenLastCalledWith('dmg-desc');
    rerender(
      <EntityTable
        items={[item]}
        columns={columns}
        sort={SORT}
        sortValue="dmg-desc"
        onSortChange={onSortChange}
        caption="Weapons"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Damage' }));
    expect(onSortChange).toHaveBeenLastCalledWith('dmg-asc');
    await userEvent.click(screen.getByRole('button', { name: 'Name' }));
    expect(onSortChange).toHaveBeenLastCalledWith('name-asc');
  });
});

describe('nextSort', () => {
  const only = (...values: string[]) => ({
    param: 'sort' as const,
    default: values[0] ?? '',
    options: values.map((value) => ({ value, label: value, field: 'x', dir: 'asc' as const })),
  });
  it('starts with the first direction, then toggles', () => {
    const both = only('a-asc', 'a-desc');
    expect(nextSort(both, 'a', 'x')).toBe('a-asc');
    expect(nextSort(both, 'a', 'a-asc')).toBe('a-desc');
    expect(nextSort(both, 'a', 'x', 'desc')).toBe('a-desc');
    expect(nextSort(both, 'a', 'a-desc', 'desc')).toBe('a-asc');
  });
  it('uses the one direction that exists, or none', () => {
    expect(nextSort(only('story-asc'), 'story', 'x', 'desc')).toBe('story-asc');
    expect(nextSort(only('xp-desc'), 'xp', 'x')).toBe('xp-desc');
    expect(nextSort(only('name-asc'), 'cd', 'x')).toBeUndefined();
  });
  it('numbers start descending, everything else ascending', () => {
    expect(firstDirection('decimal')).toBe('desc');
    expect(firstDirection('int')).toBe('desc');
    expect(firstDirection('percent')).toBe('desc');
    expect(firstDirection('seconds')).toBe('desc');
    expect(firstDirection('date')).toBe('asc');
    expect(firstDirection('label')).toBe('asc');
    expect(firstDirection(undefined)).toBe('asc');
  });
});
