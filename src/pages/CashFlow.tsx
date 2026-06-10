import React, { useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
} from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { downloadCSV } from '../lib/export';
import {
  PageHeader,
  Tile,
  Label,
  Metric,
  Sparkline,
  DotPlot,
  StatHero,
  Select,
  Button,
  GhostButton,
  StatusDot,
} from '../components/ui';
import type { DotPlotRow } from '../components/ui';

const zar = (amount: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

const toRows = (entries: { name: string; value: number }[]): DotPlotRow[] => {
  const max = Math.max(1, ...entries.map((e) => e.value));
  return entries
    .sort((a, b) => b.value - a.value)
    .map((e) => ({ label: e.name, value: e.value / max, readout: zar(e.value) }));
};

const CashFlow: React.FC = () => {
  const { cashFlow, sales } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [period, setPeriod] = useState('week');
  const [showAllTx, setShowAllTx] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    showToast('Refreshing cash flow…', 'info');
    setTimeout(() => setRefreshing(false), 900);
  };

  const dateRange = useMemo(() => {
    const today = new Date();
    switch (period) {
      case 'today':
        return { start: today, end: today };
      case 'week':
        return { start: startOfWeek(today), end: endOfWeek(today) };
      case 'month':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case '14days':
        return { start: subDays(today, 13), end: today };
      default:
        return { start: subDays(today, 6), end: today };
    }
  }, [period]);

  const filteredCashFlow = useMemo(
    () =>
      cashFlow.filter((entry) =>
        isWithinInterval(new Date(entry.date), { start: dateRange.start, end: dateRange.end }),
      ),
    [cashFlow, dateRange],
  );

  const totalIncome = filteredCashFlow.filter((e) => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = filteredCashFlow.filter((e) => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const expenseRatio = totalIncome > 0 ? Math.min(100, (totalExpenses / totalIncome) * 100) : 0;

  const receivables = sales
    .filter((s) => s.status === 'pending' || s.status === 'overdue')
    .reduce((sum, s) => sum + s.total, 0);

  const chartData = useMemo(() => {
    const days: { date: string; revenue: number; expenses: number }[] = [];
    const dayCount = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 14;
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const label = dayCount <= 7 ? format(date, 'EEE') : format(date, 'MMM dd');
      const dayIncome = cashFlow
        .filter((cf) => format(new Date(cf.date), 'yyyy-MM-dd') === dateStr && cf.type === 'income')
        .reduce((sum, cf) => sum + cf.amount, 0);
      const dayExpenses = cashFlow
        .filter((cf) => format(new Date(cf.date), 'yyyy-MM-dd') === dateStr && cf.type === 'expense')
        .reduce((sum, cf) => sum + cf.amount, 0);
      days.push({ date: label, revenue: dayIncome, expenses: dayExpenses });
    }
    return days;
  }, [cashFlow, period]);

  const incomeSeries = chartData.map((d) => d.revenue);
  const expenseSeries = chartData.map((d) => d.expenses);

  const incomeBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredCashFlow.filter((e) => e.type === 'income').forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return toRows(Object.entries(categories).map(([name, value]) => ({ name, value })));
  }, [filteredCashFlow]);

  const expenseBreakdown = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredCashFlow.filter((e) => e.type === 'expense').forEach((e) => {
      categories[e.category] = (categories[e.category] || 0) + e.amount;
    });
    return toRows(Object.entries(categories).map(([name, value]) => ({ name, value })));
  }, [filteredCashFlow]);

  const recentTransactions = useMemo(
    () => {
      const sorted = [...filteredCashFlow].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
      return showAllTx ? sorted : sorted.slice(0, 10);
    },
    [filteredCashFlow, showAllTx],
  );

  const handleExport = () => {
    const rows = filteredCashFlow.map((e) => ({
      Date: format(new Date(e.date), 'yyyy-MM-dd'),
      Type: e.type,
      Category: e.category,
      Description: e.description || '',
      Amount: e.amount,
    }));
    if (!rows.length) {
      showToast('Nothing to export for this period.', 'warning');
      return;
    }
    downloadCSV(`nodal-cashflow-${period}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showToast(`Exported ${rows.length} transaction${rows.length > 1 ? 's' : ''} to CSV.`, 'success');
  };

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Financial Intelligence"
        title="Cash Flow"
        subtitle="Monitor revenue, expenses, and financial health in real time."
        actions={
          <>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="today">Today</option>
              <option value="week">This week</option>
              <option value="14days">Last 14 days</option>
              <option value="month">This month</option>
            </Select>
            <Button variant="accent" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[140px]">
        <Metric label="Total income" value={zar(totalIncome)} accent />
        <Metric label="Total expenses" value={zar(totalExpenses)} />
        <Metric label="Net profit" value={zar(netProfit)} critical={netProfit < 0} hint={netProfit >= 0 ? 'positive' : 'negative'} />
        <Metric label="Receivables" value={zar(receivables)} hint="outstanding" />
      </div>

      {/* Bento body */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:auto-rows-[150px]">
        {/* Income vs expenses dual sparkline */}
        <Tile span="lg:col-span-8 lg:row-span-2" className="justify-between">
          <div className="flex items-start justify-between">
            <div>
              <Label>Revenue vs Expenses</Label>
              <p className="mt-1 text-[0.8125rem] text-faint">
                {format(dateRange.start, 'MMM dd')} – {format(dateRange.end, 'MMM dd, yyyy')}
              </p>
            </div>
            <GhostButton onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </GhostButton>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-positive" />
                <span className="text-[0.8125rem] text-muted">Income</span>
              </div>
              <div className="tnum text-[1.5rem] font-bold text-ink">{zar(totalIncome)}</div>
              <Sparkline data={incomeSeries} className="mt-2 w-full text-positive" width={260} height={48} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-negative" />
                <span className="text-[0.8125rem] text-muted">Expenses</span>
              </div>
              <div className="tnum text-[1.5rem] font-bold text-ink">{zar(totalExpenses)}</div>
              <Sparkline data={expenseSeries} className="mt-2 w-full text-negative" width={260} height={48} />
            </div>
          </div>
        </Tile>

        {/* Profit overview */}
        <Tile span="lg:col-span-4 lg:row-span-2" className="justify-between">
          <Label>Profit overview</Label>
          <StatHero label="Profit margin" value={`${profitMargin.toFixed(1)}%`} size="lg" />
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-[0.8125rem]">
                <span className="text-muted">Income</span>
                <span className="tnum font-semibold text-positive">{zar(totalIncome)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                <div className="h-full rounded-full bg-positive" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[0.8125rem]">
                <span className="text-muted">Expenses</span>
                <span className="tnum font-semibold text-negative">{zar(totalExpenses)}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                <div className="h-full rounded-full bg-negative" style={{ width: `${expenseRatio}%` }} />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-hairline pt-3">
            <span className="text-[0.875rem] font-semibold text-ink">Net profit</span>
            <span className={`tnum text-[0.9375rem] font-bold ${netProfit >= 0 ? 'text-positive' : 'text-negative'}`}>
              {zar(netProfit)}
            </span>
          </div>
        </Tile>

        {/* Income by category */}
        <Tile span="lg:col-span-6 lg:row-span-2">
          <Label>Income by category</Label>
          <div className="mt-4">
            {incomeBreakdown.length ? (
              <DotPlot rows={incomeBreakdown} />
            ) : (
              <p className="py-8 text-center text-[0.875rem] text-faint">No income recorded this period.</p>
            )}
          </div>
        </Tile>

        {/* Expenses by category */}
        <Tile span="lg:col-span-6 lg:row-span-2">
          <Label>Expenses by category</Label>
          <div className="mt-4">
            {expenseBreakdown.length ? (
              <DotPlot rows={expenseBreakdown.map((r) => ({ ...r, critical: true }))} />
            ) : (
              <p className="py-8 text-center text-[0.875rem] text-faint">No expenses recorded this period.</p>
            )}
          </div>
        </Tile>
      </div>

      {/* Recent transactions */}
      <Tile flush className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5">
          <Label>Recent transactions</Label>
          <GhostButton pill onClick={() => setShowAllTx((v) => !v)}>{showAllTx ? 'Show less' : 'View all'}</GhostButton>
        </div>
        <div className="mt-3 overflow-x-auto nodal-scroll">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr>
                {['Date', 'Description', 'Category', 'Type', 'Amount'].map((h) => (
                  <th
                    key={h}
                    className={`px-5 py-3.5 text-[0.6875rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint ${
                      h === 'Amount' ? 'text-right' : ''
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-t border-hairline transition-colors hover:bg-surface-2">
                  <td className="px-5 py-3.5 text-[0.8125rem] text-faint">{format(new Date(tx.date), 'MMM dd, yyyy')}</td>
                  <td className="px-5 py-3.5 text-[0.875rem] text-ink">{tx.description}</td>
                  <td className="px-5 py-3.5 text-[0.8125rem] text-muted">{tx.category}</td>
                  <td className="px-5 py-3.5">
                    <StatusDot tone={tx.type === 'income' ? 'positive' : 'critical'} label={tx.type} />
                  </td>
                  <td
                    className={`tnum px-5 py-3.5 text-right text-[0.875rem] font-semibold ${
                      tx.type === 'income' ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {zar(tx.amount)}
                  </td>
                </tr>
              ))}
              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center text-[0.875rem] text-faint">
                    No transactions in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Tile>
    </div>
  );
};

export default CashFlow;
