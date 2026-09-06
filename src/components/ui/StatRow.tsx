import React from 'react';
import { Tile } from './Tile';
import { Label } from './Label';
import { cn } from '../../lib/cn';

export interface Stat {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}

const COLS: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };

/**
 * A single slim tile holding a few figures side by side — for the pages whose
 * job is to show statistics. Everywhere else, prefer no numbers at all.
 */
export const StatRow: React.FC<{ stats: Stat[]; className?: string }> = ({ stats, className }) => (
  <Tile className={cn('!py-4', className)}>
    <dl className={cn('grid grid-cols-2 gap-x-4 gap-y-5', COLS[stats.length] || 'md:grid-cols-4')}>
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'min-w-0',
            // Dividers: between the two mobile columns, and between all columns from md up.
            i === 0 ? '' : i % 2 === 0 ? 'md:border-l md:border-hairline md:pl-4' : 'border-l border-hairline pl-4',
          )}
        >
          <dt>
            <Label>{s.label}</Label>
          </dt>
          <dd className="mt-2">
            <span className={cn('tnum block text-[1.125rem] font-bold leading-none', s.accent ? 'text-accent' : 'text-ink')}>{s.value}</span>
            {s.hint && <span className="mt-1 block text-[0.75rem] leading-snug text-muted">{s.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  </Tile>
);
