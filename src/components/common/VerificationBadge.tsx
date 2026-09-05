import React from 'react';
import { ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import type { VerificationStatus } from '../../types';
import { cn } from '../../lib/cn';

const META: Record<VerificationStatus, { label: string; icon: React.ElementType; cls: string }> = {
  verified: { label: 'Verified', icon: ShieldCheck, cls: 'bg-positive/15 text-positive' },
  pending: { label: 'Verification submitted', icon: Clock, cls: 'bg-accent-soft text-accent' },
  unverified: { label: 'Not verified', icon: ShieldAlert, cls: 'bg-surface-inset text-muted' },
};

export const VerificationBadge: React.FC<{ status: VerificationStatus; className?: string; compact?: boolean }> = ({
  status,
  className,
  compact,
}) => {
  const m = META[status] ?? META.unverified;
  const Icon = m.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em]',
        m.cls,
        className,
      )}
      title={m.label}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
      {!compact && m.label}
    </span>
  );
};

export default VerificationBadge;
