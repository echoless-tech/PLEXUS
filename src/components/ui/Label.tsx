import React from 'react';
import { cn } from '../../lib/cn';

interface LabelProps extends React.HTMLAttributes<HTMLSpanElement> {
  onAccent?: boolean;
}

/**
 * Micro label — small, muted, uppercase, wide tracking.
 * The quiet counterpoint to the large display metrics.
 */
export const Label: React.FC<LabelProps> = ({ onAccent, className, children, ...rest }) => (
  <span
    className={cn(
      'block text-[0.6875rem] font-semibold uppercase leading-none',
      'tracking-[var(--tracking-label)]',
      onAccent ? 'text-accent-contrast/70' : 'text-faint',
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);
