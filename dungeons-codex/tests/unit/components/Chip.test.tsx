import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '@/components/ui/Chip';

describe('Chip', () => {
  it('exposes its state through aria-pressed', () => {
    const { rerender } = render(<Chip>Melee</Chip>);
    expect(screen.getByRole('button', { name: 'Melee' })).toHaveAttribute('aria-pressed', 'false');
    rerender(<Chip selected>Melee</Chip>);
    expect(screen.getByRole('button', { name: 'Melee' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the count bubble and includes it in the accessible name', () => {
    render(<Chip count={12}>Melee</Chip>);
    // Browsers put a space between the two flex items; jsdom's name algorithm does not, hence \s*.
    expect(screen.getByRole('button', { name: /^Melee\s*12$/ })).toBeInTheDocument();
  });

  it('calls onClick and ignores clicks when disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Chip onClick={onClick}>Ranged</Chip>);
    await userEvent.click(screen.getByRole('button', { name: 'Ranged' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Chip onClick={onClick} disabled>
        Ranged
      </Chip>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Ranged' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
