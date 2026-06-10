import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowUpRight,
  Plus,
  RefreshCw,
  TriangleAlert,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { Tile, Label, StatHero, Sparkline, DotPlot, GhostButton } from '../components/ui';
import type { DotPlotRow } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { getStockStatus } from '../data';
import { cn } from '../lib/cn';

const zar = (n: number) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const zarCompact = (n: number) =>
  n >= 1000 ? `R${(n / 1000).toFixed(1)}k` : `R${n.toFixed(0)}`;

const Dashboard: React.FC = () => {
  const products = useAppStore((s) => s.products);
  const sales = useAppStore((s) => s.sales);
  const cashFlow = useAppStore((s) => s.cashFlow);
  const showToast = useAppStore((s) => s.showToast);
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    showToast('Refreshing cash movement…', 'info');
    setTimeout(() => setRefreshing(false), 900);
  };

  const totalRevenue = sales.filter((s) => s.status === 'paid').reduce((sum, s) => sum + s.total, 0);
  const pendingOrders = sales.filter((s) => s.status === 'pending').length;
  const overdueCount = sales.filter((s) => s.status === 'overdue').length;
  const lowStock = products.filter((p) => getStockStatus(p.quantity, p.reorderLevel) !== 'in-stock');

  // Margin across catalogue
  const margin = React.useMemo(() => {
    const rev = products.reduce((s, p) => s + p.price, 0);
    const cost = products.reduce((s, p) => s + p.costPrice, 0);
    return rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  }, [products]);

  // 14-day income / expense series from cash flow
  const { incomeSeries, expenseSeries } = React.useMemo(() => {
    const inc: number[] = [];
    const exp: number[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = format(d, 'yyyy-MM-dd');
      const dayInc = cashFlow
        .filter((c) => format(new Date(c.date), 'yyyy-MM-dd') === key && c.type === 'income')
        .reduce((s, c) => s + c.amount, 0);
      const dayExp = cashFlow
        .filter((c) => format(new Date(c.date), 'yyyy-MM-dd') === key && c.type === 'expense')
        .reduce((s, c) => s + c.amount, 0);
      inc.push(dayInc);
      exp.push(dayExp);
    }
    return { incomeSeries: inc, expenseSeries: exp };
  }, [cashFlow]);

  const periodIncome = incomeSeries.reduce((s, v) => s + v, 0);
  const periodExpense = expenseSeries.reduce((s, v) => s + v, 0);

  const lowStockRows: DotPlotRow[] = lowStock.slice(0, 6).map((p) => {
    const out = p.quantity === 0;
    return {
      label: p.name,
      value: Math.min(1, p.quantity / p.reorderLevel),
      readout: `${p.quantity}/${p.reorderLevel}`,
      critical: out,
    };
  });

  const recentSales = [...sales]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const insights = [
    overdueCount > 0 && {
      critical: true,
      icon: <TriangleAlert size={15} strokeWidth={2} />,
      text: `${overdueCount} invoice${overdueCount > 1 ? 's' : ''} overdue — chase ${zarCompact(
        sales.filter((s) => s.status === 'overdue').reduce((a, s) => a + s.total, 0),
      )} in receivables.`,
    },
    lowStock.length > 0 && {
      critical: lowStock.some((p) => p.quantity === 0),
      icon: <TrendingUp size={15} strokeWidth={2} />,
      text: `${lowStock.length} product${lowStock.length > 1 ? 's' : ''} below reorder level — restock before the weekend peak.`,
    },
    {
      critical: false,
      icon: <Lightbulb size={15} strokeWidth={2} />,
      text: `Catalogue margin sits at ${margin.toFixed(0)}% — ahead of the ${Math.max(
        18,
        Math.round(margin - 6),
      )}% network median.`,
    },
  ].filter(Boolean) as { critical: boolean; icon: React.ReactNode; text: string }[];

  const statusStyle = (status: string) =>
    status === 'overdue'
      ? 'text-accent'
      : status === 'pending'
        ? 'text-muted'
        : 'text-positive';

  return (
    <div className="animate-rise mx-auto max-w-[1400px]">
      {/* Page intro */}
      <div className="flex flex-wrap items-end justify-between gap-4 py-6">
        <div>
          <Label>
            {format(new Date(), 'EEEE, d MMMM')}
          </Label>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.02em] text-ink sm:text-[2rem]">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, Amara
          </h1>
        </div>
        <button onClick={() => navigate('/sales')} className="neu inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[0.8125rem] font-semibold text-canvas transition-[box-shadow,transform,opacity] hover:opacity-90">
          <Plus size={16} strokeWidth={2.25} />
          New sale
        </button>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:auto-rows-[172px]">
        {/* Hero — Total Revenue */}
        <Tile span="sm:col-span-2 lg:col-span-5 lg:row-span-2">
          <StatHero
            label="Total revenue · paid"
            value={zar(totalRevenue)}
            change={12.5}
            changeLabel="vs last week"
            size="xl"
          />
          <div className="mt-6 text-muted">
            <Sparkline
              data={incomeSeries}
              width={520}
              height={56}
              strokeWidth={1.75}
              fill="var(--accent-soft)"
              stroke="var(--accent)"
              className="w-full"
            />
          </div>
        </Tile>

        {/* Credit score — terracotta critical callout */}
        <Tile accent span="lg:col-span-3">
          <div className="flex h-full flex-col justify-between">
            <Label onAccent>Credit score</Label>
            <div className="flex items-end justify-between">
              <span className="tnum text-[3rem] font-bold leading-none tracking-[-0.02em] text-accent-contrast">
                742
              </span>
              <span className="mb-1 rounded-full bg-accent-contrast/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-accent-contrast">
                Grade A
              </span>
            </div>
          </div>
        </Tile>

        {/* Opportunities */}
        <Tile span="lg:col-span-4">
          <StatHero
            label="Open opportunities"
            value="+R12.9k"
            change={4.2}
            changeLabel="potential / month"
            trend={[4, 6, 5, 8, 7, 9, 11, 10, 13]}
            size="md"
          />
        </Tile>

        {/* Margin */}
        <Tile span="lg:col-span-4">
          <StatHero label="Catalogue margin" value={`${margin.toFixed(0)}%`} change={1.8} changeLabel="vs last month" size="md" />
        </Tile>

        {/* Pending orders */}
        <Tile span="lg:col-span-3">
          <div className="flex h-full flex-col justify-between">
            <Label>Pending orders</Label>
            <div className="flex items-baseline gap-2">
              <span className="tnum text-[2.5rem] font-bold leading-none text-ink">{pendingOrders}</span>
              <span className="text-[0.8125rem] text-muted">awaiting payment</span>
            </div>
          </div>
        </Tile>

        {/* Revenue vs Expenses — quiet dual sparkline */}
        <Tile span="sm:col-span-2 lg:col-span-5 lg:row-span-2" className="justify-between">
          <div className="flex items-start justify-between">
            <div>
              <Label>Cash movement · 14 days</Label>
              <p className="mt-3 tnum text-[1.875rem] font-bold leading-none text-ink">
                {zar(periodIncome - periodExpense)}
              </p>
              <p className="mt-1.5 text-[0.8125rem] text-muted">net flow</p>
            </div>
            <GhostButton aria-label="Refresh" onClick={handleRefresh}>
              <RefreshCw size={16} strokeWidth={1.75} className={cn(refreshing && 'animate-spin')} />
            </GhostButton>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[0.8125rem] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink/70" />
                  Income
                </span>
                <span className="tnum text-[0.8125rem] font-medium text-ink">{zar(periodIncome)}</span>
              </div>
              <Sparkline data={incomeSeries} width={520} height={40} stroke="var(--text)" strokeWidth={1.5} className="w-full" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="flex items-center gap-2 text-[0.8125rem] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-faint" />
                  Expenses
                </span>
                <span className="tnum text-[0.8125rem] font-medium text-muted">{zar(periodExpense)}</span>
              </div>
              <Sparkline data={expenseSeries} width={520} height={40} className="w-full text-faint" strokeWidth={1.5} showEndDot={false} />
            </div>
          </div>
        </Tile>

        {/* Low stock — dot plot */}
        <Tile span="sm:col-span-2 lg:col-span-4 lg:row-span-2">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <Label>Low stock</Label>
              <p className="mt-2 text-[0.8125rem] text-muted">{lowStock.length} items need attention</p>
            </div>
            {lowStock.some((p) => p.quantity === 0) && (
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent">
                Critical
              </span>
            )}
          </div>
          {lowStockRows.length > 0 ? (
            <DotPlot rows={lowStockRows} />
          ) : (
            <p className="py-8 text-center text-[0.875rem] text-muted">Everything is well stocked.</p>
          )}
        </Tile>

        {/* AI insights */}
        <Tile span="sm:col-span-2 lg:col-span-3 lg:row-span-2">
          <div className="mb-5 flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-accent">
              <Lightbulb size={14} strokeWidth={2} />
            </span>
            <Label>AI insights</Label>
          </div>
          <div className="flex flex-col gap-4">
            {insights.map((ins, i) => (
              <div key={i} className="flex gap-3">
                <span className={cn('mt-0.5 shrink-0', ins.critical ? 'text-accent' : 'text-muted')}>
                  {ins.icon}
                </span>
                <p className="text-[0.8125rem] leading-relaxed text-ink/85">{ins.text}</p>
              </div>
            ))}
          </div>
        </Tile>
      </div>

      {/* Recent sales — quiet table */}
      <Tile flush className="mt-4">
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <Label>Recent sales</Label>
            <p className="mt-2 text-[0.8125rem] text-muted">Latest transactions across all channels</p>
          </div>
          <GhostButton pill className="gap-1" onClick={() => navigate('/sales')}>
            View all
            <ArrowUpRight size={15} strokeWidth={2} />
          </GhostButton>
        </div>

        <div className="nodal-scroll mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="text-faint">
                {['Invoice', 'Customer', 'Items', 'Amount', 'Status', 'Date'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'px-6 py-3 text-[0.6875rem] font-semibold uppercase tracking-[var(--tracking-label)]',
                      (i === 3) && 'text-right',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id} className="transition-colors hover:bg-surface-2">
                  <td className="px-6 py-3.5 text-[0.875rem] font-semibold text-ink">{sale.invoiceNumber}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-inset text-[0.75rem] font-semibold text-ink">
                        {(sale.customerName || 'G').charAt(0)}
                      </span>
                      <span className="text-[0.875rem] text-ink">{sale.customerName || 'Walk-in'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-[0.875rem] text-muted">{sale.items.length} items</td>
                  <td className="tnum px-6 py-3.5 text-right text-[0.875rem] font-semibold text-ink">{zar(sale.total)}</td>
                  <td className="px-6 py-3.5">
                    <span className={cn('inline-flex items-center gap-1.5 text-[0.8125rem] font-medium capitalize', statusStyle(sale.status))}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', sale.status === 'overdue' ? 'bg-accent' : sale.status === 'pending' ? 'bg-faint' : 'bg-positive')} />
                      {sale.status}
                    </span>
                  </td>
                  <td className="tnum px-6 py-3.5 text-[0.875rem] text-muted">{format(new Date(sale.createdAt), 'd MMM')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="h-2" />
      </Tile>
    </div>
  );
};

export default Dashboard;
