import React from 'react';
import { Tile } from './Tile';
import { Label } from './Label';
import { cn } from '../../lib/cn';

interface MetricProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Paint value in terracotta for critical metrics. */
  critical?: boolean;
  accent?: boolean;
  className?: string;
}

/** Compact stat tile for the per-page metric strips. */
export const Metric: React.FC<MetricProps> = ({ label, value, hint, critical, accent, className }) => (
  <Tile accent={accent} className={cn('gap-5', className)}>
    <Label onAccent={accent}>{label}</Label>
    <div className="mt-auto flex items-baseline gap-2">
      <span
        className={cn(
          'tnum text-[2rem] font-bold leading-none tracking-[-0.02em]',
          accent ? 'text-accent-contrast' : critical ? 'text-accent' : 'text-ink',
        )}
      >
        {value}
      </span>
      {hint && (
        <span className={cn('text-[0.8125rem]', accent ? 'text-accent-contrast/70' : 'text-muted')}>{hint}</span>
      )}
    </div>
  </Tile>
);
