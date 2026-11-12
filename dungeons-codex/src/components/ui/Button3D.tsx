import { Slot, Slottable } from '@radix-ui/react-slot';
import type { ComponentProps, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export type Button3DVariant = 'accent' | 'gold' | 'stone' | 'redstone' | 'ghost';
export type Button3DSize = 'sm' | 'md' | 'lg';

const VARIANT: Record<Button3DVariant, string> = {
  accent: '',
  gold: 'b3d-gold',
  stone: 'b3d-stone',
  redstone: 'b3d-redstone',
  ghost: 'b3d-ghost',
};

// sm is 36px per the spec; touch devices still get a 44px target.
const SIZE: Record<Button3DSize, string> = {
  sm: 'h-9 px-4 text-[0.8125rem] pointer-coarse:min-h-11',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-7 text-base',
};

export type Button3DProps = ComponentProps<'button'> & {
  variant?: Button3DVariant;
  size?: Button3DSize;
  /** Render the single child (e.g. a next/link <Link>) with the button styling instead of a <button>. */
  asChild?: boolean;
  /** Leading icon, decorative (give icon-only buttons an aria-label). */
  icon?: ReactNode;
  fullWidth?: boolean;
};

export function Button3D({
  variant = 'accent',
  size = 'md',
  asChild = false,
  icon,
  fullWidth,
  disabled,
  className,
  children,
  onClick,
  ...rest
}: Button3DProps) {
  const classes = cn('b3d', VARIANT[variant], SIZE[size], fullWidth && 'w-full', className);

  if (asChild) {
    // A link can't be `disabled`, so mirror it with aria-disabled and swallow the click.
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      if (disabled) e.preventDefault();
      else onClick?.(e);
    };
    return (
      <Slot
        {...rest}
        className={classes}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : rest.tabIndex}
        onClick={handleClick}
      >
        {icon}
        <Slottable>{children}</Slottable>
      </Slot>
    );
  }

  return (
    <button type="button" {...rest} className={classes} disabled={disabled} onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}
