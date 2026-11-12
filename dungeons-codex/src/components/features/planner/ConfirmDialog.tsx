'use client';

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description} className="max-w-md">
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
