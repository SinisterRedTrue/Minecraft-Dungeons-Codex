'use client';

import * as ToastPrimitive from '@radix-ui/react-toast';
import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type ToastVariant = 'default' | 'success' | 'error';

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds; defaults to 4000. */
  duration?: number;
};

type ToastItem = ToastOptions & { id: number };
type ToastApi = { toast: (options: ToastOptions) => void };

const ToastContext = createContext<ToastApi | null>(null);

const VARIANT_BORDER: Record<ToastVariant, string> = {
  default: 'border-line-strong',
  success: 'border-accent-text',
  error: 'border-redstone-text',
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((options: ToastOptions) => {
    setItems((current) => [...current, { ...options, id: nextId++ }]);
  }, []);
  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id));
  }, []);
  const api = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {items.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => !open && remove(t.id)}
            className={cn(
              'dc-toast flex items-start gap-3 rounded-card border-[1.5px] bg-surface-1 p-4 pr-2 text-text shadow-card',
              VARIANT_BORDER[t.variant ?? 'default'],
            )}
          >
            {t.variant === 'success' && (
              <CircleCheck
                size={20}
                className="mt-0.5 shrink-0 text-accent-text"
                aria-hidden="true"
              />
            )}
            {t.variant === 'error' && (
              <CircleAlert
                size={20}
                className="mt-0.5 shrink-0 text-redstone-text"
                aria-hidden="true"
              />
            )}
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-bold">{t.title}</ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-0.5 text-sm text-muted">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss notification"
              className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-chip text-muted hover:bg-surface-2 hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed right-0 bottom-0 z-[100] m-0 flex w-full max-w-sm list-none flex-col gap-2 p-4 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
