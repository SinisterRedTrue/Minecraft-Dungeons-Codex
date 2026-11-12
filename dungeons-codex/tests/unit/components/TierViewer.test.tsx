import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TierViewer } from '@/components/features/forge/TierViewer';
import { realTierProps } from '../../helpers/forge';

describe('TierViewer: enchantments', () => {
  it('shows tier I first, with its effect and what the tier costs', () => {
    render(<TierViewer {...realTierProps('d1', 'enchantments', 'sharpness')} />);
    expect(screen.getByRole('heading', { name: 'Tier viewer' })).toBeInTheDocument();
    expect(screen.getByTestId('tier-text')).toHaveTextContent('+10% damage');
    expect(screen.getByTestId('tier-cost')).toHaveTextContent('This tier costs 1 points');
    expect(screen.getByTestId('tier-cost')).toHaveTextContent('Reaching it from scratch costs 1');
  });

  it('switches tiers and adds up the cumulative cost', async () => {
    const user = userEvent.setup();
    render(<TierViewer {...realTierProps('d1', 'enchantments', 'sharpness')} />);
    await user.click(screen.getByRole('radio', { name: 'Tier III' }));
    expect(screen.getByTestId('tier-text')).toHaveTextContent('+33% damage');
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByTestId('tier-cost')).toHaveTextContent('This tier costs 3 points');
    expect(screen.getByTestId('tier-cost')).toHaveTextContent('Reaching it from scratch costs 6');
    await user.click(screen.getByRole('radio', { name: 'Tier II' }));
    expect(screen.getByTestId('tier-cost')).toHaveTextContent('Reaching it from scratch costs 3');
  });

  it('keeps one tier selected when the active one is clicked again', async () => {
    const user = userEvent.setup();
    render(<TierViewer {...realTierProps('d1', 'enchantments', 'sharpness')} />);
    await user.click(screen.getByRole('radio', { name: 'Tier I' }));
    expect(screen.getByRole('radio', { name: 'Tier I' })).toBeChecked();
  });

  it('shows no cost for a Dungeons II enchantment (none is documented)', () => {
    render(<TierViewer {...realTierProps('d2', 'enchantments', 'fire-aspect')} />);
    expect(screen.queryByTestId('tier-cost')).not.toBeInTheDocument();
    expect(screen.getByTestId('tier-text')).toBeInTheDocument();
  });
});

describe('TierViewer: talismans', () => {
  it('names the metal of each tier and shows the tier effect', async () => {
    const user = userEvent.setup();
    render(<TierViewer {...realTierProps('d2', 'talismans', 'amethyst-lens')} />);
    expect(screen.getByRole('radio', { name: 'Tier I, Bronze' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Tier III, Gold' }));
    expect(screen.getByTestId('tier-panel')).toHaveTextContent('Tier III · Gold');
    expect(screen.queryByTestId('tier-cost')).not.toBeInTheDocument();
  });
});

describe('TierViewer: empty', () => {
  it('renders nothing without tiers', () => {
    const { container } = render(<TierViewer kind="enchantment" name="X" tiers={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
