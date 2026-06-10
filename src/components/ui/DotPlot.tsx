import React from 'react';
import { cn } from '../../lib/cn';

export interface DotPlotRow {
  label: string;
  /** 0..1 fraction of the track that is filled. */
  value: number;
  /** Right-aligned readout, e.g. "8 / 25". */
  readout?: string;
  /** Mark as critical — paints the dot + readout in terracotta. */
  critical?: boolean;
}

interface DotPlotProps {
  rows: DotPlotRow[];
  /** Number of dots per track. */
  steps?: number;
  className?: string;
}

/**
 * Precise dot plot — a quiet replacement for progress bars / bar charts.
 * Each row is a row of discrete dots; filled dots encode the value.
 */
export const DotPlot: React.FC<DotPlotProps> = ({ rows, steps = 12, className }) => {
  return (
    <div className={cn('flex flex-col gap-3.5', className)}>
      {rows.map((row, i) => {
        const filled = Math.round(Math.min(1, Math.max(0, row.value)) * steps);
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-[0.8125rem] text-ink">{row.label}</span>
            <div className="flex flex-1 items-center gap-[3px]" aria-hidden>
              {Array.from({ length: steps }).map((_, d) => {
                const on = d < filled;
                return (
                  <span
                    key={d}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-colors',
                      on
                        ? row.critical
                          ? 'bg-accent'
                          : 'bg-ink/70'
                        : 'bg-surface-inset',
                    )}
                  />
                );
              })}
            </div>
            {row.readout && (
              <span
                className={cn(
                  'tnum w-14 shrink-0 text-right text-[0.75rem] tabular-nums',
                  row.critical ? 'text-accent font-semibold' : 'text-muted',
                )}
              >
                {row.readout}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
