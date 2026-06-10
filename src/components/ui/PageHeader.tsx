import React from 'react';
import { Label } from './Label';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** Consistent page intro — quiet eyebrow, bold title, optional actions. */
export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, actions }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 py-6">
    <div>
      {eyebrow && <Label>{eyebrow}</Label>}
      <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.02em] text-ink sm:text-[2rem]">{title}</h1>
      {subtitle && <p className="mt-1.5 max-w-xl text-[0.875rem] text-muted">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);
