import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BrowserTypeRows } from '@/components/filters/BrowserTypeRows';
import { TypeSelector } from '@/components/filters/TypeSelector';
import { FACET_ALL, facetCounts } from '@/lib/filters/engine';
import { resolveOptions } from '@/lib/filters/options';
import type { TypeDef } from '@/lib/filters/types';
import { DEFS, ITEMS, KIND, WEAPON_TYPE, weapon } from '../lib/filters/fixtures';

const OPTIONS = [
  { value: 'melee', label: 'Melee' },
  { value: 'ranged', label: 'Ranged' },
];

describe('TypeSelector', () => {
  it('shows All plus one pressed-state chip per option, with counts', () => {
    render(
      <TypeSelector
        def={KIND}
        options={OPTIONS}
        counts={{ [FACET_ALL]: 5, melee: 3, ranged: 2 }}
        value="melee"
        onChange={() => {}}
        eyebrow="Step 1 · Type"
      />,
    );
    const group = screen.getByRole('group', { name: 'Type' });
    expect(within(group).getByRole('button', { name: 'All 5' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(within(group).getByRole('button', { name: 'Melee 3' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(within(group).getByRole('button', { name: 'Ranged 2' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect(screen.getByText('Step 1 · Type')).toBeInTheDocument();
  });

  it('selects an option, deselects it again, and All clears', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TypeSelector
        def={KIND}
        options={OPTIONS}
        value={undefined}
        onChange={onChange}
        eyebrow="Type"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ranged' }));
    expect(onChange).toHaveBeenLastCalledWith('ranged');
    rerender(
      <TypeSelector
        def={KIND}
        options={OPTIONS}
        value="ranged"
        onChange={onChange}
        eyebrow="Type"
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ranged' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    await userEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('mutes an option with no results but keeps it visible', () => {
    render(
      <TypeSelector
        def={KIND}
        options={OPTIONS}
        counts={{ [FACET_ALL]: 3, melee: 3 }}
        value={undefined}
        onChange={() => {}}
        eyebrow="Type"
      />,
    );
    expect(screen.getByRole('button', { name: 'Ranged 0' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Melee 3' })).toBeEnabled();
  });

  it('moves focus with the arrow keys, Home and End, skipping disabled chips', async () => {
    render(
      <TypeSelector
        def={KIND}
        options={[...OPTIONS, { value: 'magic', label: 'Magic' }]}
        counts={{ [FACET_ALL]: 5, melee: 3, ranged: 0, magic: 2 }}
        value={undefined}
        onChange={() => {}}
        eyebrow="Type"
      />,
    );
    screen.getByRole('button', { name: /^All/ }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^Melee/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^Magic/ })).toHaveFocus(); // Ranged is disabled
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('button', { name: /^All/ })).toHaveFocus(); // wraps
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('button', { name: /^Magic/ })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('button', { name: /^All/ })).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('button', { name: /^Magic/ })).toHaveFocus();
    await userEvent.keyboard('a'); // other keys are left alone
    expect(screen.getByRole('button', { name: /^Magic/ })).toHaveFocus();
  });

  it('turns a long option list into a searchable picker', async () => {
    const onChange = vi.fn();
    const sets: TypeDef = { ...KIND, key: 'set', label: 'Armor set', level: 2 };
    const many = Array.from({ length: 31 }, (_, i) => ({ value: `set-${i}`, label: `Set ${i}` }));
    render(
      <TypeSelector
        def={sets}
        options={many}
        counts={{ [FACET_ALL]: 31, ...Object.fromEntries(many.map((o) => [o.value, 4])) }}
        value={undefined}
        onChange={onChange}
        eyebrow="Step 2 · Armor set"
      />,
    );
    expect(screen.queryByRole('button', { name: /^Set 3/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Armor set: All' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search armor set' }), 'set 12');
    expect(screen.queryByRole('button', { name: /^Set 3/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Set 12/ }));
    expect(onChange).toHaveBeenLastCalledWith('set-12');
  });

  it('the picker says when nothing matches', async () => {
    const many = Array.from({ length: 31 }, (_, i) => ({ value: `set-${i}`, label: `Set ${i}` }));
    render(
      <TypeSelector
        def={{ ...KIND, label: 'Armor set' }}
        options={many}
        value="set-1"
        onChange={() => {}}
        eyebrow="Step 2"
      />,
    );
    expect(screen.getByRole('button', { name: 'Armor set: Set 1' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Armor set: Set 1' }));
    await userEvent.type(screen.getByRole('searchbox'), 'zzz');
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });
});

describe('BrowserTypeRows', () => {
  const defs = DEFS;
  const options = Object.fromEntries(
    defs.flatMap((d) => (d.kind === 'type' ? [[d.key, resolveOptions(d, ITEMS)]] : [])),
  );

  it('shows level 1 only until a level 1 chip is chosen, then reveals level 2', () => {
    const { rerender } = render(
      <BrowserTypeRows
        defs={defs}
        state={{}}
        counts={facetCounts(ITEMS, defs, {})}
        options={options}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole('group', { name: 'Type' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Weapon type' })).not.toBeInTheDocument();

    const state = { t: 'melee' };
    rerender(
      <BrowserTypeRows
        defs={defs}
        state={state}
        counts={facetCounts(ITEMS, defs, state)}
        options={options}
        onChange={() => {}}
      />,
    );
    const second = screen.getByRole('group', { name: 'Weapon type' });
    // Only types that exist under Melee, most frequent first (all have one here: A to Z).
    expect(
      within(second)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['All 3', 'Daggers 1', 'Hammer 1', 'Sword 1']);
  });

  it('choosing a level 1 chip also clears level 2', async () => {
    const onChange = vi.fn();
    const state = { t: 'melee', wt: 'sword' };
    render(
      <BrowserTypeRows
        defs={defs}
        state={state}
        counts={facetCounts(ITEMS, defs, state)}
        options={options}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /^Ranged/ }));
    expect(onChange).toHaveBeenCalledWith({ t: 'ranged', wt: null }, 'push');
  });

  it('renders nothing without type defs or without options', () => {
    const { container } = render(
      <BrowserTypeRows defs={[]} state={{}} counts={{}} options={{}} onChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    const { container: c2 } = render(
      <BrowserTypeRows
        defs={[WEAPON_TYPE, KIND]}
        state={{ t: 'melee' }}
        counts={{ weaponType: { [FACET_ALL]: 0 } }}
        options={{ weaponType: [{ value: 'sword', label: 'Sword' }], kind: OPTIONS }}
        onChange={() => {}}
      />,
    );
    // The level 2 row has no option with results, so only the level 1 row remains.
    expect(within(c2).queryByRole('group', { name: 'Weapon type' })).not.toBeInTheDocument();
    expect(within(c2).getByRole('group', { name: 'Type' })).toBeInTheDocument();
    expect(weapon).toBeDefined();
  });
});
