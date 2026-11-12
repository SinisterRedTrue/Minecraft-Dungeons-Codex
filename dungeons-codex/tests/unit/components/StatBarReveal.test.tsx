import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '@/components/layout/Reveal';
import { StatBar } from '@/components/ui/StatBar';

describe('StatBar', () => {
  it('is a named meter with the formatted value and a width relative to max', () => {
    render(<StatBar label="Damage" value={30} max={60} unit="hp" />);
    const meter = screen.getByRole('meter', { name: 'Damage' });
    expect(meter).toHaveAttribute('aria-valuenow', '30');
    expect(meter).toHaveAttribute('aria-valuemax', '60');
    expect(meter).toHaveAttribute('aria-valuetext', '30 hp');
    expect(meter.firstElementChild).toHaveStyle({ width: '50%' });
  });

  it('clamps to the bar and survives a zero max', () => {
    const { rerender } = render(<StatBar label="X" value={999} max={10} />);
    expect(screen.getByRole('meter').firstElementChild).toHaveStyle({ width: '100%' });
    rerender(<StatBar label="X" value={5} max={0} />);
    expect(screen.getByRole('meter').firstElementChild).toHaveStyle({ width: '0%' });
  });

  it('says so in text when the value is approximate', () => {
    render(<StatBar label="Damage" value={412} max={500} approximate />);
    expect(screen.getByText('Approximate:')).toHaveClass('sr-only');
    expect(screen.getByText(/412/)).toBeInTheDocument();
  });
});

describe('Reveal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds .in once the element intersects, then stops observing', () => {
    let trigger: (isIntersecting: boolean) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          trigger = (isIntersecting) => cb([{ isIntersecting }]);
        }
        observe() {}
        disconnect = disconnect;
      },
    );

    render(
      <Reveal index={3} as="section">
        <p>hello</p>
      </Reveal>,
    );
    const el = screen.getByText('hello').parentElement as HTMLElement;
    expect(el.tagName).toBe('SECTION');
    expect(el).toHaveClass('reveal');
    expect(el).not.toHaveClass('in');
    expect(el.style.getPropertyValue('--reveal-delay')).toBe('120ms');

    act(() => trigger(false));
    expect(el).not.toHaveClass('in');
    act(() => trigger(true));
    expect(el).toHaveClass('in');
    expect(disconnect).toHaveBeenCalled();
  });

  it('caps the stagger at 8 steps', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    render(
      <Reveal index={20}>
        <p>late</p>
      </Reveal>,
    );
    expect(
      (screen.getByText('late').parentElement as HTMLElement).style.getPropertyValue(
        '--reveal-delay',
      ),
    ).toBe('320ms');
  });
});
