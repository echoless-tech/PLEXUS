import React from 'react';
import { cn } from '../../lib/cn';

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Pill text button. Defaults to icon-only square. */
  pill?: boolean;
}

/**
 * Low-contrast control — blends into the surface until hovered.
 * Used for filters, settings, refresh, "view all", etc.
 */
export const GhostButton = React.forwardRef<HTMLButtonElement, GhostButtonProps>(
  ({ pill, className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(
        'neu-sm inline-flex items-center justify-center gap-1.5 text-muted',
        'transition-[box-shadow,transform,background-color,color] duration-200',
        'hover:bg-surface-inset hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        pill
          ? 'rounded-full px-3 py-1.5 text-[0.8125rem] font-medium'
          : 'h-9 w-9 rounded-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);
GhostButton.displayName = 'GhostButton';
