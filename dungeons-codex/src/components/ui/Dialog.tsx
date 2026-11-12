'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const OVERLAY_CLASS = 'dc-fade fixed inset-0 z-50 bg-overlay';
export const CLOSE_BUTTON_CLASS =
  'absolute right-3 top-3 grid size-11 cursor-pointer place-items-center rounded-chip text-muted transition-colors hover:bg-surface-2 hover:text-text';

export type DialogContentProps = {
  /** Required: it names the dialog for assistive tech. */
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Called when the dialog has closed; one without a Radix trigger returns focus here. */
  onCloseAutoFocus?: (event: Event) => void;
};

export function DialogContent({
  title,
  description,
  children,
  className,
  onCloseAutoFocus,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY_CLASS} />
      <DialogPrimitive.Content
        // Radix warns without a Description; opting out explicitly is its documented escape hatch.
        {...(description ? {} : { 'aria-describedby': undefined })}
        onCloseAutoFocus={onCloseAutoFocus}
        className={cn(
          'dc-pop fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-panel border-[1.5px] border-line bg-surface-1 p-6 shadow-card sm:p-8',
          className,
        )}
      >
        <DialogPrimitive.Title className="pr-10 font-display text-h3 font-extrabold text-text uppercase">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="mt-1 text-muted">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        <div className="mt-4">{children}</div>
        <DialogPrimitive.Close aria-label="Close" className={CLOSE_BUTTON_CLASS}>
          <X size={20} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
