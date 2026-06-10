import React from 'react';
import { cn } from '../../lib/cn';

interface TileProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind grid-span classes, e.g. "lg:col-span-2 lg:row-span-2". */
  span?: string;
  /** Lift the surface one tonal step (for nested/feature tiles). */
  raised?: boolean;
  /** Render the terracotta accent treatment (critical callouts only). */
  accent?: boolean;
  /** Remove default padding (for charts/tables that bleed to the edge). */
  flush?: boolean;
  interactive?: boolean;
  as?: React.ElementType;
}

/**
 * Bento tile. Borderless — separated from the canvas by a flat tonal shift.
 * Generous radius, no shadow, no glow.
 */
export const Tile: React.FC<TileProps> = ({
  span,
  raised,
  accent,
  flush,
  interactive,
  as: Tag = 'div',
  className,
  children,
  ...rest
}) => {
  return (
    <Tag
      className={cn(
        'relative flex flex-col rounded-[var(--radius-tile)] overflow-hidden',
        accent ? 'glass-accent text-accent-contrast' : raised ? 'glass-strong' : 'glass',
        !flush && 'p-5 sm:p-6',
        interactive &&
          'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        span,
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
};
