import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
}

/** Low-contrast native select styled to match the bento controls. */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ containerClassName, className, children, ...props }, ref) => (
    <div className={cn('relative inline-flex items-center', containerClassName)}>
      <select
        ref={ref}
        className={cn(
          'appearance-none rounded-full bg-surface-inset/60 py-2 pl-3.5 pr-9 text-[0.875rem] font-medium text-ink transition-colors hover:bg-surface-inset focus:bg-surface-inset focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-faint" />
    </div>
  ),
);
Select.displayName = 'Select';
