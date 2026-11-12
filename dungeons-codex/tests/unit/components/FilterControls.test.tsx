import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActiveFilterChips } from '@/components/filters/ActiveFilterChips';
import { MultiFilter } from '@/components/filters/MultiFilter';
import { RangeFilter } from '@/components/filters/RangeFilter';
import { ToggleFilter } from '@/components/filters/ToggleFilter';
import type { ActiveChip } from '@/lib/filters/state';
import { PROPS, DAMAGE, UNIQUE } from '../lib/filters/fixtures';

describe('RangeFilter', () => {
  const bounds = { min: 0, max: 20 };

  it('shows the full bounds when nothing is set, and the active range otherwise', () => {
    const { rerender } = render(
      <RangeFilter
        def={DAMAGE}
        bounds={bounds}
        value={undefined}
        onChange={() => {}}
        missing={0}
      />,
    );
    expect(screen.getByRole('spinbutton', { name: 'Minimum Damage' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'Maximum Damage' })).toHaveValue(20);
    rerender(
      <RangeFilter def={DAMAGE} bounds={bounds} value={[5, 12]} onChange={() => {}} missing={0} />,
    );
    expect(screen.getByRole('spinbutton', { name: 'Minimum Damage' })).toHaveValue(5);
    expect(screen.getByText('5 – 12')).toBeInTheDocument();
  });

  it('commits a typed minimum, and clears when the range returns to the full bounds', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RangeFilter
        def={DAMAGE}
        bounds={bounds}
        value={undefined}
        onChange={onChange}
        missing={0}
      />,
    );
    const min = screen.getByRole('spinbutton', { name: 'Minimum Damage' });
    await userEvent.clear(min);
    await userEvent.type(min, '6{Enter}');
    expect(onChange).toHaveBeenLastCalledWith([6, 20]);

    rerender(
      <RangeFilter def={DAMAGE} bounds={bounds} value={[6, 20]} onChange={onChange} missing={0} />,
    );
    const again = screen.getByRole('spinbutton', { name: 'Minimum Damage' });
    await userEvent.clear(again);
    await userEvent.type(again, '0{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('follows the slider keys', async () => {
    const onChange = vi.fn();
    render(
      <RangeFilter def={DAMAGE} bounds={bounds} value={[5, 12]} onChange={onChange} missing={0} />,
    );
    screen.getByRole('slider', { name: 'Maximum Damage' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith([5, 11.5]);
  });

  it('says how many items without the stat are hidden, only while narrowed', () => {
    const { rerender } = render(
      <RangeFilter def={DAMAGE} bounds={bounds} value={[5, 12]} onChange={() => {}} missing={3} />,
    );
    expect(screen.getByText('3 items without this stat are hidden.')).toBeInTheDocument();
    rerender(
      <RangeFilter def={DAMAGE} bounds={bounds} value={[5, 12]} onChange={() => {}} missing={1} />,
    );
    expect(screen.getByText('1 item without this stat is hidden.')).toBeInTheDocument();
    rerender(
      <RangeFilter
        def={DAMAGE}
        bounds={bounds}
        value={undefined}
        onChange={() => {}}
        missing={3}
      />,
    );
    expect(screen.queryByText(/without this stat/)).not.toBeInTheDocument();
  });
});

describe('MultiFilter', () => {
  const few = [
    { value: 'dual-wield', label: 'Dual Wield' },
    { value: 'spin-attack', label: 'Spin Attack' },
  ];
  const many = Array.from({ length: 12 }, (_, i) => ({ value: `tag-${i}`, label: `Tag ${i}` }));

  it('lists options with facet counts and no search box when short', () => {
    render(
      <MultiFilter
        def={PROPS}
        options={few}
        counts={{ 'dual-wield': 14, 'spin-attack': 6 }}
        selected={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('checkbox', { name: /Dual Wield/ })).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('adds and removes a selection; an empty selection becomes null', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MultiFilter def={PROPS} options={few} selected={[]} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Dual Wield/ }));
    expect(onChange).toHaveBeenLastCalledWith(['dual-wield']);
    rerender(
      <MultiFilter def={PROPS} options={few} selected={['dual-wield']} onChange={onChange} />,
    );
    await userEvent.click(screen.getByRole('checkbox', { name: /Spin Attack/ }));
    expect(onChange).toHaveBeenLastCalledWith(['dual-wield', 'spin-attack']);
    await userEvent.click(screen.getByRole('checkbox', { name: /Dual Wield/ }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    expect(screen.queryByText(/must have all/)).not.toBeInTheDocument();
  });

  it('searches a long list, and says when nothing matches', async () => {
    render(<MultiFilter def={PROPS} options={many} selected={[]} onChange={() => {}} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
    const search = screen.getByRole('searchbox', { name: 'Search properties' });
    await userEvent.type(search, 'tag 1');
    // "Tag 1", "Tag 10", "Tag 11"
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    await userEvent.clear(search);
    await userEvent.type(search, 'zzz');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getByText('No matches')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search properties' }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(12);
  });

  it('mutes zero-count options but keeps a selected one usable; "all" explains itself', () => {
    render(
      <MultiFilter
        def={PROPS}
        options={few}
        counts={{ 'dual-wield': 0, 'spin-attack': 0 }}
        selected={['spin-attack', 'dual-wield']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('checkbox', { name: /Dual Wield/ })).toBeEnabled();
    expect(screen.getByText('Items must have all 2 of these.')).toBeInTheDocument();
    render(
      <MultiFilter
        def={PROPS}
        options={few}
        counts={{ 'dual-wield': 0 }}
        selected={[]}
        onChange={() => {}}
      />,
    );
    expect(screen.getAllByRole('checkbox', { name: /Dual Wield/ })[1]).toBeDisabled();
  });
});

describe('ToggleFilter', () => {
  it('switches on to true and off to null', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<ToggleFilter def={UNIQUE} checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Unique only' }));
    expect(onChange).toHaveBeenLastCalledWith(true);
    rerender(<ToggleFilter def={UNIQUE} checked onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Unique only' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});

describe('ActiveFilterChips', () => {
  const chips: ActiveChip[] = [
    { id: 'a', label: 'Daggers', patch: { wt: null } },
    { id: 'b', label: 'Damage 3–4', patch: { dmg: null } },
  ];

  it('renders nothing when no filter is active', () => {
    const { container } = render(
      <ActiveFilterChips chips={[]} anyActive={false} onRemove={() => {}} onClearAll={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('removes one chip with its patch, and clears everything', async () => {
    const onRemove = vi.fn();
    const onClearAll = vi.fn();
    render(
      <ActiveFilterChips chips={chips} anyActive onRemove={onRemove} onClearAll={onClearAll} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Damage 3–4' }));
    expect(onRemove).toHaveBeenCalledWith({ dmg: null });
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('still offers Clear all when only a chip-less filter (a level 1 type) is active', () => {
    render(<ActiveFilterChips chips={[]} anyActive onRemove={() => {}} onClearAll={() => {}} />);
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });
});
