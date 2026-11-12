'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRef, type PointerEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { CLOSE_BUTTON_CLASS, OVERLAY_CLASS } from './Dialog';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const DISMISS_DRAG_PX = 80;

export type SheetContentProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

/** Bottom sheet (mobile filters, pickers): top corners rounded, drag handle, same focus trap as Dialog. */
export function SheetContent({ title, description, children, className }: SheetContentProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dragStart = useRef<number | null>(null);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragStart.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current !== null && e.clientY - dragStart.current > DISMISS_DRAG_PX) {
      closeRef.current?.click();
    }
    dragStart.current = null;
  };

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={OVERLAY_CLASS} />
      <DialogPrimitive.Content
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'dc-sheet fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-panel border-[1.5px] border-b-0 border-line bg-surface-1',
          className,
        )}
      >
        <div
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
        >
          <span className="h-1.5 w-12 rounded-chip bg-control" />
        </div>
        <div className="overflow-y-auto px-6 pb-8">
          <DialogPrimitive.Title className="pr-10 font-display text-h3 font-extrabold text-text uppercase">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-muted">
              {description}
            </DialogPrimitive.Description>
          ) : null}
          <div className="mt-4">{children}</div>
        </div>
        <DialogPrimitive.Close ref={closeRef} aria-label="Close" className={CLOSE_BUTTON_CLASS}>
          <X size={20} aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
