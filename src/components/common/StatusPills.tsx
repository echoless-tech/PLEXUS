import React from 'react';
import type { ContractStatus, MilestoneStatus } from '../../types';
import { cn } from '../../lib/cn';

const CONTRACT: Record<ContractStatus, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-surface-inset text-muted' },
  proposed: { label: 'Awaiting buyer', cls: 'bg-accent-soft text-accent' },
  active: { label: 'Active · terms locked', cls: 'bg-positive/15 text-positive' },
  completed: { label: 'Completed', cls: 'bg-ink/10 text-ink' },
  cancelled: { label: 'Cancelled', cls: 'bg-negative/10 text-negative' },
};

const MILESTONE: Record<MilestoneStatus, { label: string; cls: string }> = {
  pending: { label: 'Not started', cls: 'bg-surface-inset text-muted' },
  evidence_submitted: { label: 'Awaiting approval', cls: 'bg-accent-soft text-accent' },
  approved: { label: 'Approved · pay now', cls: 'bg-accent text-accent-contrast' },
  paid: { label: 'Paid', cls: 'bg-positive/15 text-positive' },
  disputed: { label: 'Disputed', cls: 'bg-negative/10 text-negative' },
};

const Pill: React.FC<{ label: string; cls: string; className?: string }> = ({ label, cls, className }) => (
  <span
    className={cn(
      'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]',
      cls,
      className,
    )}
  >
    {label}
  </span>
);

export const ContractStatusPill: React.FC<{ status: ContractStatus; className?: string }> = ({ status, className }) => (
  <Pill {...CONTRACT[status]} className={className} />
);

export const MilestoneStatusPill: React.FC<{ status: MilestoneStatus; className?: string }> = ({ status, className }) => (
  <Pill {...MILESTONE[status]} className={className} />
);
