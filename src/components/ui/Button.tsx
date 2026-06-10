import React from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'accent' | 'soft';
}

/** Primary action button. `solid` = ink, `accent` = terracotta, `soft` = tonal. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'neu inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[0.875rem] font-semibold',
        'transition-[box-shadow,transform,background-color,color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50',
        variant === 'solid' && 'bg-ink text-canvas hover:bg-ink/90',
        variant === 'accent' && 'bg-accent text-accent-contrast hover:opacity-90',
        variant === 'soft' && 'bg-surface-inset text-ink hover:bg-surface-inset/70',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
