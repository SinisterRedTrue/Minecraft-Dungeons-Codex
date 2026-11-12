import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button3D } from '@/components/ui/Button3D';

describe('Button3D', () => {
  it('renders a real button by default, with the variant class', () => {
    render(<Button3D variant="gold">Play</Button3D>);
    const btn = screen.getByRole('button', { name: 'Play' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).toHaveClass('b3d', 'b3d-gold');
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button3D onClick={onClick}>Go</Button3D>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as a link with asChild and keeps its icon next to the label', () => {
    render(
      <Button3D asChild icon={<svg data-testid="icon" />}>
        <a href="https://example.test/d1">Dungeons</a>
      </Button3D>,
    );
    const link = screen.getByRole('link', { name: 'Dungeons' });
    expect(link).toHaveAttribute('href', 'https://example.test/d1');
    expect(link).toHaveClass('b3d');
    expect(link).toContainElement(screen.getByTestId('icon'));
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('disables a button: not clickable, not focusable', async () => {
    const onClick = vi.fn();
    render(
      <Button3D disabled onClick={onClick}>
        Nope
      </Button3D>,
    );
    const btn = screen.getByRole('button', { name: 'Nope' });
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disables a link: aria-disabled, out of the tab order, click swallowed', async () => {
    const onClick = vi.fn();
    render(
      <Button3D asChild disabled onClick={onClick}>
        <a href="https://example.test/x">Locked</a>
      </Button3D>,
    );
    const link = screen.getByRole('link', { name: 'Locked' });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    // The anchor has pointer-events: none in the browser; fire the event directly to prove the handler guards it.
    link.click();
    expect(onClick).not.toHaveBeenCalled();
  });
});
