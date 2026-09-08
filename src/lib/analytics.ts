/**
 * Historical business performance data.
 *
 * PLEXUS has no ledger of past monthly turnover yet, so we synthesise a stable
 * 12-month history per business — seeded by the business uid so it never changes
 * between reloads — to power the Analytics charts. In production this is replaced
 * by real figures aggregated from Run documents (invoices/receipts/statements)
 * and settled agreement stages.
 */

export interface MonthPoint {
  month: string; // YYYY-MM
  label: string; // short month name
  revenue: number;
  expenses: number;
  net: number;
  invoices: number;
}

// Deterministic PRNG so a given business always gets the same history.
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round1000 = (n: number) => Math.max(0, Math.round(n / 1000) * 1000);

export function generateHistory(seedKey: string, months = 12): MonthPoint[] {
  const seedFn = xmur3(seedKey || 'plexus');
  const seed = seedFn();
  const rand = mulberry32(seed);

  const base = 70_000 + Math.floor(rand() * 380_000); // R70k–R450k baseline monthly revenue
  const trend = 0.004 + rand() * 0.03; // 0.4%–3.4% monthly growth
  const marginBase = 0.12 + rand() * 0.2; // 12%–32% net margin
  const phase = rand() * Math.PI * 2;
  const avgInvoiceValue = 9_000 + rand() * 14_000;

  const now = new Date();
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const step = months - 1 - i;
    const season = 1 + 0.16 * Math.sin((d.getMonth() / 12) * Math.PI * 2 + phase);
    const noise = 0.86 + rand() * 0.28;
    const growth = Math.pow(1 + trend, step);
    const revenue = round1000(base * growth * season * noise);
    const margin = Math.min(0.45, Math.max(0.04, marginBase + (rand() - 0.5) * 0.12));
    const expenses = round1000(revenue * (1 - margin));
    points.push({
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-ZA', { month: 'short' }),
      revenue,
      expenses,
      net: revenue - expenses,
      invoices: Math.max(1, Math.round(revenue / avgInvoiceValue)),
    });
  }
  return points;
}

export interface HistorySummary {
  totalRevenue: number;
  avgRevenue: number;
  totalNet: number;
  totalInvoices: number;
  /** % change from the first to the last month of the window. */
  growthPct: number;
  best: MonthPoint;
}

export function summariseHistory(points: MonthPoint[]): HistorySummary {
  const totalRevenue = points.reduce((s, p) => s + p.revenue, 0);
  const totalNet = points.reduce((s, p) => s + p.net, 0);
  const totalInvoices = points.reduce((s, p) => s + p.invoices, 0);
  const first = points[0]?.revenue || 0;
  const last = points[points.length - 1]?.revenue || 0;
  const growthPct = first ? ((last - first) / first) * 100 : 0;
  const best = points.reduce((a, b) => (b.revenue > a.revenue ? b : a), points[0]);
  return {
    totalRevenue,
    avgRevenue: points.length ? Math.round(totalRevenue / points.length) : 0,
    totalNet,
    totalInvoices,
    growthPct,
    best,
  };
}
