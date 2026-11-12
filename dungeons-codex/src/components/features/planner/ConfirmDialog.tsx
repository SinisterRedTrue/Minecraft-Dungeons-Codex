'use client';

import { useLayoutEffect, useRef } from 'react';
import { Button3D } from '@/components/ui/Button3D';
import { Dialog, DialogClose, DialogContent } from '@/components/ui/Dialog';

/** "Are you sure?": a small dialog for clearing a build or deleting a saved one. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  // The button that opened this dialog is not a Radix trigger, so remember it and return focus.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={title}
        description={description}
        className="max-w-md"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
      >
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button3D variant="stone">Cancel</Button3D>
          </DialogClose>
          <Button3D
            variant="redstone"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button3D>
        </div>
      </DialogContent>
    </Dialog>
  );
}
