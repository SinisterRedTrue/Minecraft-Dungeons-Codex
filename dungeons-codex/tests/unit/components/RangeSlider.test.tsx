import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RangeSlider, type RangeValue } from '@/components/ui/RangeSlider';

function Harness({
  onCommit,
  onChange,
}: {
  onCommit?: (v: RangeValue) => void;
  onChange?: (v: RangeValue) => void;
}) {
  const [value, setValue] = useState<RangeValue>([10, 40]);
  return (
    <RangeSlider
      label="Damage"
      min={0}
      max={100}
      value={value}
      onValueChange={(v) => {
        setValue(v);
        onChange?.(v);
      }}
      onValueCommit={onCommit}
    />
  );
}

describe('RangeSlider', () => {
  it('exposes two named thumbs and two number inputs with the current values', () => {
    render(<Harness />);
    expect(screen.getByRole('slider', { name: 'Minimum Damage' })).toHaveAttribute(
      'aria-valuenow',
      '10',
    );
    expect(screen.getByRole('slider', { name: 'Maximum Damage' })).toHaveAttribute(
      'aria-valuenow',
      '40',
    );
    expect(screen.getByRole('spinbutton', { name: 'Minimum Damage' })).toHaveValue(10);
    expect(screen.getByRole('spinbutton', { name: 'Maximum Damage' })).toHaveValue(40);
  });

  it('changes the value from the keyboard and commits', async () => {
    const onCommit = vi.fn();
    const onChange = vi.fn();
    render(<Harness onCommit={onCommit} onChange={onChange} />);

    screen.getByRole('slider', { name: 'Maximum Damage' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');

    expect(onChange).toHaveBeenLastCalledWith([10, 42]);
    expect(onCommit).toHaveBeenLastCalledWith([10, 42]);
    expect(screen.getByRole('spinbutton', { name: 'Maximum Damage' })).toHaveValue(42);
  });

  it('supports Home / End on the minimum thumb', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    screen.getByRole('slider', { name: 'Minimum Damage' }).focus();
    await userEvent.keyboard('{Home}');
    expect(onCommit).toHaveBeenLastCalledWith([0, 40]);
  });

  it('commits a typed number on Enter, clamped to the range and to the other thumb', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);

    const max = screen.getByRole('spinbutton', { name: 'Maximum Damage' });
    await userEvent.clear(max);
    await userEvent.type(max, '500{Enter}');
    expect(onCommit).toHaveBeenLastCalledWith([10, 100]);

    const min = screen.getByRole('spinbutton', { name: 'Minimum Damage' });
    await userEvent.clear(min);
    await userEvent.type(min, '250{Enter}');
    // Clamped to 100 (range max), which is also the other thumb's value.
    expect(onCommit).toHaveBeenLastCalledWith([100, 100]);
  });

  it('ignores an empty input on blur and restores the real value', async () => {
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} />);
    const min = screen.getByRole('spinbutton', { name: 'Minimum Damage' });
    await userEvent.clear(min);
    await userEvent.tab();
    expect(onCommit).not.toHaveBeenCalled();
    expect(min).toHaveValue(10);
  });
});
