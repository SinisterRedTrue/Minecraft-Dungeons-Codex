import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from '@/components/ui/Dialog';

function setup() {
  return render(
    <>
      <button type="button">Outside</button>
      <Dialog>
        <DialogTrigger asChild>
          <Button3D>Open</Button3D>
        </DialogTrigger>
        <DialogContent title="Confirm" description="Are you sure?">
          <input aria-label="Name" />
          <DialogClose asChild>
            <Button3D variant="stone">Cancel</Button3D>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>,
  );
}

describe('Dialog', () => {
  it('opens as a named, described modal dialog', async () => {
    setup();
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog', { name: 'Confirm' });
    expect(dialog).toHaveAccessibleDescription('Are you sure?');
  });

  it('moves focus inside and traps Tab within the dialog', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

    // Tab enough times to wrap around every control (input, Cancel, close X): focus never leaves.
    for (let i = 0; i < 7; i++) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
      expect(document.activeElement).not.toBe(
        screen.getByRole('button', { name: 'Outside', hidden: true }),
      );
    }
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(trigger);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it('closes from the Close button and from a DialogClose child', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
