import React from 'react';
import type { MonthPoint } from '../../lib/analytics';

const kfmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `R${(n / 1_000_000).toFixed(1)}m`;
  if (Math.abs(n) >= 1_000) return `R${Math.round(n / 1000)}k`;
  return `R${n}`;
};

const zarFull = (n: number) => 'R\u00a0' + Math.round(n).toLocaleString('en-ZA');

/** Grouped monthly revenue vs expenses — HTML/CSS bars so text stays crisp. */
export const RevenueExpenseChart: React.FC<{ data: MonthPoint[] }> = ({ data }) => {
  const max = Math.max(1, ...data.map((p) => Math.max(p.revenue, p.expenses)));
  const ticks = [1, 0.5, 0].map((f) => Math.round(max * f));
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[0.75rem] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'var(--accent)' }} /> Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: 'color-mix(in srgb, var(--text) 28%, transparent)' }} /> Expenses
        </span>
      </div>
      <div className="flex gap-2">
        {/* Y axis */}
        <div className="flex h-44 w-10 shrink-0 flex-col justify-between py-0.5 text-right text-[0.625rem] text-faint">
          {ticks.map((t) => (
            <span key={t}>{kfmt(t)}</span>
          ))}
        </div>
        {/* Plot */}
        <div className="min-w-0 flex-1">
          <div className="flex h-44 items-end gap-1 border-b border-hairline">
            {data.map((p) => (
              <div key={p.month} className="group flex h-full flex-1 items-end justify-center gap-[3px]" title={`${p.label}: ${zarFull(p.revenue)} revenue · ${zarFull(p.expenses)} expenses`}>
                <div className="w-1/2 max-w-[10px] rounded-t-sm transition-opacity group-hover:opacity-80" style={{ height: `${(p.revenue / max) * 100}%`, background: 'var(--accent)' }} />
                <div className="w-1/2 max-w-[10px] rounded-t-sm transition-opacity group-hover:opacity-80" style={{ height: `${(p.expenses / max) * 100}%`, background: 'color-mix(in srgb, var(--text) 28%, transparent)' }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            {data.map((p) => (
              <span key={p.month} className="flex-1 text-center text-[0.625rem] text-faint">
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Net cash-flow trend as a smooth area + line (SVG, non-scaling stroke). */
export const NetTrendChart: React.FC<{ data: MonthPoint[] }> = ({ data }) => {
  const W = 100;
  const H = 32;
  const vals = data.map((p) => p.net);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const x = (i: number) => (data.length <= 1 ? 0 : (i / (data.length - 1)) * W);
  const y = (v: number) => H - ((v - min) / span) * (H - 2) - 1;
  const line = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.net).toFixed(2)}`).join(' ');
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-20 w-full" role="img" aria-label="Net cash flow trend">
        <path d={area} fill="var(--positive)" opacity={0.14} />
        <path d={line} fill="none" stroke="var(--positive)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1 flex gap-1">
        {data.map((p) => (
          <span key={p.month} className="flex-1 text-center text-[0.625rem] text-faint">
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
};
