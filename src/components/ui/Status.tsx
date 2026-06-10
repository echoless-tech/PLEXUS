import React from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'positive' | 'critical' | 'muted';

const toneDot: Record<Tone, string> = {
  neutral: 'bg-ink/70',
  positive: 'bg-positive',
  critical: 'bg-accent',
  muted: 'bg-faint',
};

const toneText: Record<Tone, string> = {
  neutral: 'text-ink',
  positive: 'text-positive',
  critical: 'text-accent',
  muted: 'text-muted',
};

/** Quiet status pill with a leading dot. */
export const StatusDot: React.FC<{ tone: Tone; label: string; className?: string }> = ({
  tone,
  label,
  className,
}) => (
  <span className={cn('inline-flex items-center gap-1.5 text-[0.8125rem] font-medium capitalize', toneText[tone], className)}>
    <span className={cn('h-1.5 w-1.5 rounded-full', toneDot[tone])} />
    {label}
  </span>
);

/** Small soft-filled badge for categories / counts. */
export const Badge: React.FC<{ children: React.ReactNode; tone?: Tone; className?: string }> = ({
  children,
  tone = 'muted',
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]',
      tone === 'critical' ? 'bg-accent-soft text-accent' : 'bg-surface-inset text-muted',
      className,
    )}
  >
    {children}
  </span>
);
