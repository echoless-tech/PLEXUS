import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Label } from './Label';
import { Sparkline } from './Sparkline';

interface StatHeroProps {
  label: string;
  value: string;
  /** Signed change in percent, e.g. 12.5 or -4.2. */
  change?: number;
  changeLabel?: string;
  /** Optional micro-trend sparkline. */
  trend?: number[];
  /** Dramatic hero sizing for the headline tile. */
  size?: 'md' | 'lg' | 'xl';
  /** Render on the terracotta accent surface. */
  onAccent?: boolean;
  className?: string;
}

const valueSize = {
  md: 'text-[2rem] sm:text-[2.25rem]',
  lg: 'text-[2.75rem] sm:text-[3.25rem]',
  xl: 'text-[3.5rem] sm:text-[4.5rem]',
};

/**
 * Hero metric — dramatic hierarchy: a quiet uppercase micro label above a
 * large, bold, tabular display number, with an optional quiet sparkline.
 */
export const StatHero: React.FC<StatHeroProps> = ({
  label,
  value,
  change,
  changeLabel,
  trend,
  size = 'md',
  onAccent,
  className,
}) => {
  const up = change !== undefined && change > 0;
  const down = change !== undefined && change < 0;

  return (
    <div className={cn('flex h-full flex-col justify-between gap-6', className)}>
      <Label onAccent={onAccent}>{label}</Label>

      <div className="flex flex-col gap-3">
        <span
          className={cn(
            'tnum font-bold leading-[0.95] tracking-[-0.02em]',
            valueSize[size],
            onAccent ? 'text-accent-contrast' : 'text-ink',
          )}
        >
          {value}
        </span>

        <div className="flex items-center justify-between gap-4">
          {change !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[0.8125rem] font-medium',
                onAccent
                  ? 'text-accent-contrast/80'
                  : up
                    ? 'text-positive'
                    : down
                      ? 'text-negative'
                      : 'text-muted',
              )}
            >
              {up && <ArrowUpRight size={15} strokeWidth={2.25} />}
              {down && <ArrowDownRight size={15} strokeWidth={2.25} />}
              <span className="tnum">
                {up ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className={cn('font-normal', onAccent ? 'text-accent-contrast/60' : 'text-faint')}>
                  {changeLabel}
                </span>
              )}
            </span>
          )}

          {trend && trend.length > 1 && (
            <Sparkline
              data={trend}
              width={104}
              height={32}
              strokeWidth={1.5}
              className={onAccent ? 'text-accent-contrast/80' : 'text-muted'}
            />
          )}
        </div>
      </div>
    </div>
  );
};
