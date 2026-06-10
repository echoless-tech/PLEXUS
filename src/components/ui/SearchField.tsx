import React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../lib/cn';

interface SearchFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

/** Low-contrast search input that surfaces on focus. */
export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ containerClassName, className, ...props }, ref) => (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full bg-surface-inset/60 px-3.5 py-2 transition-colors focus-within:bg-surface-inset',
        containerClassName,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-faint" />
      <input
        ref={ref}
        className={cn(
          'w-full bg-transparent text-[0.875rem] text-ink placeholder:text-faint focus:outline-none',
          className,
        )}
        {...props}
      />
    </div>
  ),
);
SearchField.displayName = 'SearchField';
