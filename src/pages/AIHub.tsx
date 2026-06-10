import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  RefreshCw,
  Brain,
  ShieldCheck,
  Shield,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Lightbulb,
  Trophy,
  Package,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import {
  getRecommendations,
  getCreditScore,
  getBenchmarking,
  getAnomalies,
  getForecast,
  buildBusinessContext,
  AIRecommendation,
  CreditScoreData,
  BenchmarkData,
  AnomalyData,
  ForecastData,
} from '../services/ai';
import { PageHeader, Tile, Label, SegmentTabs, Sparkline, Button } from '../components/ui';

// ── Fallback data used only when the API is unavailable ──────────────────
const FALLBACK_CREDIT_SCORE: CreditScoreData = {
  score: 742,
  maxScore: 850,
  grade: 'A-',
  factors: [
    { name: 'Payment History', score: 92, weight: 35, trend: 'up' },
    { name: 'Cash Flow Stability', score: 78, weight: 25, trend: 'up' },
    { name: 'Sales Velocity', score: 85, weight: 20, trend: 'stable' },
    { name: 'Supplier Reliability', score: 88, weight: 10, trend: 'up' },
    { name: 'Inventory Turnover', score: 71, weight: 10, trend: 'down' },
  ],
  preQualified: [
    { type: 'Micro-Loan', amount: 'R25,000', rate: '12% p.a.', provider: 'NODAL Finance' },
    { type: 'BNPL - Inventory', amount: 'R15,000', rate: '0% (30 days)', provider: 'SupplyNow' },
    { type: 'Working Capital', amount: 'R50,000', rate: '15% p.a.', provider: 'AfriCredit' },
  ],
};

const FALLBACK_BENCHMARKS: BenchmarkData[] = [
  { metric: 'Revenue Growth', you: 82, industry: 65, top10: 95 },
  { metric: 'Profit Margin', you: 68, industry: 55, top10: 88 },
  { metric: 'Inventory Turn', you: 71, industry: 60, top10: 90 },
  { metric: 'Customer Retention', you: 75, industry: 58, top10: 92 },
  { metric: 'Cash Cycle', you: 60, industry: 50, top10: 85 },
  { metric: 'Digital Adoption', you: 90, industry: 40, top10: 95 },
];

const FALLBACK_ANOMALIES: AnomalyData[] = [
  { id: 1, type: 'fraud_risk', severity: 'high', title: 'Unusual refund pattern detected', description: '3 refunds processed in 20 minutes by same staff member — 4x above normal rate', timestamp: '2 hours ago', action: 'Review Transactions' },
  { id: 2, type: 'opportunity', severity: 'medium', title: 'Revenue spike opportunity', description: 'Customer traffic predicted to increase 35% this weekend based on local event data', timestamp: '1 hour ago', action: 'Prepare Stock' },
  { id: 3, type: 'waste', severity: 'medium', title: 'Slow-moving inventory detected', description: 'Facial Tissue Box has had 0 sales in 14 days but occupies shelf space — consider promotion', timestamp: '3 hours ago', action: 'Create Promotion' },
  { id: 4, type: 'pricing', severity: 'low', title: 'Pricing optimization available', description: 'USB-C Cables are priced 12% below market average — potential R850/month revenue increase', timestamp: '5 hours ago', action: 'Adjust Price' },
];

const FALLBACK_FORECAST: ForecastData = {
  forecast: [
    { day: 'Mon', actual: 4200, predicted: 4000, lower: 3600, upper: 4400 },
    { day: 'Tue', actual: 3800, predicted: 3900, lower: 3500, upper: 4300 },
    { day: 'Wed', actual: 5200, predicted: 5000, lower: 4600, upper: 5400 },
    { day: 'Thu', actual: 4800, predicted: 4700, lower: 4300, upper: 5100 },
    { day: 'Fri', actual: 6100, predicted: 6200, lower: 5800, upper: 6600 },
    { day: 'Sat', actual: null, predicted: 7500, lower: 6800, upper: 8200 },
    { day: 'Sun', actual: null, predicted: 5800, lower: 5200, upper: 6400 },
  ],
  patterns: [
    { pattern: 'Weekend sales surge', detail: 'Revenue increases 45% on Sat-Sun', confidence: 94 },
    { pattern: 'Mid-week dip', detail: 'Tuesday-Wednesday see 20% lower traffic', confidence: 88 },
    { pattern: 'Month-end spike', detail: 'Sales peak around payday (25th-1st)', confidence: 91 },
    { pattern: 'Holiday effect', detail: 'Public holidays boost by 60% but day-after drops 30%', confidence: 79 },
  ],
  reorderSuggestions: [
    { product: 'Cooking Oil (2L)', optimal: 'Reorder by Friday', quantity: '50 units', reason: 'Weekend demand surge predicted' },
    { product: 'Premium Rice (5kg)', optimal: 'Reorder in 4 days', quantity: '30 units', reason: 'Month-end payday approaching' },
    { product: 'Wireless Earbuds', optimal: 'Reorder next week', quantity: '20 units', reason: 'Gradual depletion at current rate' },
    { product: 'Bottled Water', optimal: 'Defer 1 week', quantity: '—', reason: 'Rain forecasted, demand drops 25%' },
  ],
};

const TABS = ['Recommendations', 'Credit Score', 'Benchmarking', 'Anomalies', 'Forecast'];

// ── Small inline UI helpers ──────────────────────────────────────────────
const Bar: React.FC<{ value: number; tone?: 'ink' | 'positive' | 'negative' | 'accent' }> = ({ value, tone = 'ink' }) => {
  const fill = tone === 'positive' ? 'bg-positive' : tone === 'negative' ? 'bg-negative' : tone === 'accent' ? 'bg-accent' : 'bg-ink/70';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
};

const Analyzing: React.FC<{ text: string }> = ({ text }) => (
  <Tile className="mb-4 items-center gap-3 py-8 text-center">
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent">
      <Brain className="h-6 w-6 animate-pulse" />
    </span>
    <p className="text-[0.9375rem] font-semibold text-ink">{text}</p>
    <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-surface-inset">
      <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
    </div>
  </Tile>
);

const AIHub: React.FC = () => {
  const { products, sales, cashFlow, businessProfile } = useAppStore();
  const showToast = useAppStore((s) => s.showToast);
  const [appliedRecs, setAppliedRecs] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [liveRecommendations, setLiveRecommendations] = useState<AIRecommendation[] | null>(null);

  const [creditScoreData, setCreditScoreData] = useState<CreditScoreData>(FALLBACK_CREDIT_SCORE);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>(FALLBACK_BENCHMARKS);
  const [liveAnomalies, setLiveAnomalies] = useState<AnomalyData[]>(FALLBACK_ANOMALIES);
  const [forecastResult, setForecastResult] = useState<ForecastData>(FALLBACK_FORECAST);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);
  const [loadingAnomalies, setLoadingAnomalies] = useState(false);
  const [loadingForecast, setLoadingForecast] = useState(false);

  const context = () => buildBusinessContext({ products, sales, cashFlow, businessProfile });

  const fetchCreditScore = async () => {
    setLoadingCredit(true);
    try {
      setCreditScoreData(await getCreditScore(context()));
    } catch (err) {
      console.error('Credit score fetch failed:', err);
    } finally {
      setLoadingCredit(false);
    }
  };

  const fetchBenchmarking = async () => {
    setLoadingBenchmark(true);
    try {
      setBenchmarkData(await getBenchmarking(context()));
    } catch (err) {
      console.error('Benchmarking fetch failed:', err);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  const fetchAnomalies = async () => {
    setLoadingAnomalies(true);
    try {
      setLiveAnomalies(await getAnomalies(context()));
    } catch (err) {
      console.error('Anomalies fetch failed:', err);
    } finally {
      setLoadingAnomalies(false);
    }
  };

  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      setForecastResult(await getForecast(context()));
    } catch (err) {
      console.error('Forecast fetch failed:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  useEffect(() => {
    setAnimatedScore(0);
    const timer = setInterval(() => {
      setAnimatedScore((prev) => {
        if (prev >= creditScoreData.score) {
          clearInterval(timer);
          return creditScoreData.score;
        }
        return prev + Math.ceil((creditScoreData.score - prev) / 10);
      });
    }, 30);
    return () => clearInterval(timer);
  }, [creditScoreData.score]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      setLiveRecommendations(await getRecommendations(context()));
    } catch (err) {
      console.error('Failed to get recommendations:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const zar = (amount: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 0 }).format(amount);

  const totalImpact = liveRecommendations
    ? liveRecommendations.reduce((sum, r) => {
        const m = r.impact.match(/[\d,]+/);
        return sum + (m ? parseInt(m[0].replace(',', '')) : 0);
      }, 0)
    : 0;

  const anomalyAccent = (severity: string) =>
    severity === 'high' ? 'before:bg-accent' : severity === 'medium' ? 'before:bg-ink/40' : 'before:bg-faint';

  const anomalyIcon = (type: string) => {
    switch (type) {
      case 'fraud_risk':
        return <Shield className="h-5 w-5" />;
      case 'opportunity':
        return <TrendingUp className="h-5 w-5" />;
      case 'waste':
        return <AlertTriangle className="h-5 w-5" />;
      case 'pricing':
        return <BarChart3 className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  // Credit ring geometry
  const ringR = 76;
  const ringC = 2 * Math.PI * ringR;
  const ringProgress = Math.min(1, animatedScore / creditScoreData.maxScore);

  const predictedSeries = forecastResult.forecast.map((f) => f.predicted);
  const actualSeries = forecastResult.forecast.map((f) => f.actual).filter((v): v is number => v != null);

  const heroStats = [
    { label: 'AI credit score', value: `${creditScoreData.score}/${creditScoreData.maxScore}` },
    { label: 'Anomalies', value: String(liveAnomalies.length) },
    { label: 'Revenue optimized', value: liveRecommendations ? `+${zar(totalImpact)}` : '—' },
    {
      label: 'AI confidence',
      value:
        creditScoreData !== FALLBACK_CREDIT_SCORE
          ? `${(creditScoreData.factors.reduce((s, f) => s + f.score * f.weight, 0) / 100).toFixed(1)}%`
          : '—',
    },
  ];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="AI Command Center"
        title="AI Hub"
        subtitle="Intelligence analyzing your business in real time."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-[0.75rem] font-semibold uppercase leading-none tracking-[0.12em] text-accent">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-accent" /> Live
          </span>
        }
      />

      {/* Hero stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:auto-rows-[128px]">
        {heroStats.map((s, i) => (
          <Tile key={s.label} accent={i === 0} className="gap-3">
            <Label onAccent={i === 0}>{s.label}</Label>
            <span className={`tnum mt-auto text-[1.75rem] font-bold leading-none ${i === 0 ? 'text-accent-contrast' : 'text-ink'}`}>
              {s.value}
            </span>
          </Tile>
        ))}
      </div>

      {/* Tabs */}
      <div className="mt-6 overflow-x-auto nodal-scroll">
        <SegmentTabs tabs={TABS} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ── Tab 0: Recommendations ─────────────────────────────────────── */}
      {activeTab === 0 && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-bold text-ink">AI-powered recommendations</h2>
              <p className="text-[0.875rem] text-muted">Personalised actions based on your data and top performers.</p>
            </div>
            <Button variant="accent" onClick={handleRunAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isAnalyzing ? 'Analysing…' : 'Run new analysis'}
            </Button>
          </div>

          {isAnalyzing && <Analyzing text="NODAL AI is analysing your business…" />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(liveRecommendations || []).map((rec) => (
              <Tile key={rec.id} className="gap-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-surface-inset px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted">
                    {rec.category}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[0.75rem] font-semibold text-accent">
                    <Sparkles className="h-3.5 w-3.5" /> {rec.confidence}% confidence
                  </span>
                </div>
                <h3 className="text-[1.0625rem] font-bold text-ink">{rec.title}</h3>
                <p className="text-[0.875rem] leading-relaxed text-muted">{rec.basis}</p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <span className="inline-flex items-center gap-1 text-[0.9375rem] font-bold text-positive">
                    <ArrowUpRight className="h-4 w-4" /> {rec.impact}
                  </span>
                  <button
                    onClick={() => {
                      const next = new Set(appliedRecs);
                      next.add(rec.id);
                      setAppliedRecs(next);
                      showToast(`Applied: ${rec.title}`, 'success');
                    }}
                    disabled={appliedRecs.has(rec.id)}
                    className={`rounded-full px-4 py-1.5 text-[0.8125rem] font-semibold transition-colors ${
                      appliedRecs.has(rec.id)
                        ? 'bg-positive/15 text-positive'
                        : 'bg-surface-inset text-ink hover:bg-surface-inset/70'
                    }`}
                  >
                    {appliedRecs.has(rec.id) ? 'Applied ✓' : 'Apply'}
                  </button>
                </div>
              </Tile>
            ))}
            {!liveRecommendations && !isAnalyzing && (
              <Tile className="md:col-span-2 items-center gap-2 py-12 text-center">
                <Lightbulb className="h-7 w-7 text-faint" />
                <p className="text-[0.9375rem] font-medium text-muted">Run an analysis to generate tailored recommendations.</p>
              </Tile>
            )}
          </div>

          {liveRecommendations && (
            <Tile accent className="mt-4 flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-contrast/15 text-accent-contrast">
                  <Trophy className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[1rem] font-bold text-accent-contrast">Total projected impact</p>
                  <p className="text-[0.8125rem] text-accent-contrast/70">If you implement all recommendations</p>
                </div>
              </div>
              <span className="tnum text-[1.75rem] font-bold text-accent-contrast">+{zar(totalImpact)}/mo</span>
            </Tile>
          )}
        </div>
      )}

      {/* ── Tab 1: Credit Score ────────────────────────────────────────── */}
      {activeTab === 1 && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-bold text-ink">AI credit score</h2>
              <p className="text-[0.875rem] text-muted">Financial health rated from cash flow, sales, and payment data.</p>
            </div>
            <Button variant="accent" onClick={fetchCreditScore} disabled={loadingCredit}>
              {loadingCredit ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {loadingCredit ? 'Calculating…' : creditScoreData !== FALLBACK_CREDIT_SCORE ? 'Recalculate' : 'Calculate score'}
            </Button>
          </div>

          {loadingCredit && <Analyzing text="Calculating your AI credit score…" />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Score ring */}
            <Tile span="lg:col-span-5" className="items-center gap-4 text-center">
              <Label>AI credit score</Label>
              <div className="relative my-2 h-[180px] w-[180px]">
                <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
                  <circle cx="90" cy="90" r={ringR} fill="none" stroke="var(--surface-inset)" strokeWidth="12" />
                  <circle
                    cx="90"
                    cy="90"
                    r={ringR}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={ringC}
                    strokeDashoffset={ringC * (1 - ringProgress)}
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="tnum text-[3rem] font-black leading-none text-ink">{animatedScore}</span>
                  <span className="text-[0.75rem] text-faint">out of {creditScoreData.maxScore}</span>
                </div>
              </div>
              <span className="rounded-full bg-accent-soft px-4 py-1.5 text-[0.9375rem] font-bold text-accent">
                Grade {creditScoreData.grade}
              </span>
              <p className="max-w-xs text-[0.8125rem] text-muted">
                Calculated from cash flow, sales velocity, payment history, and supplier reliability.
              </p>
            </Tile>

            {/* Factors */}
            <Tile span="lg:col-span-7" className="gap-5">
              <div>
                <Label>Score breakdown</Label>
                <p className="mt-1 text-[0.8125rem] text-faint">What affects your credit score</p>
              </div>
              {creditScoreData.factors.map((factor) => (
                <div key={factor.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.875rem] font-semibold text-ink">{factor.name}</span>
                      <span className="rounded-full bg-surface-inset px-2 py-0.5 text-[0.625rem] font-semibold text-faint">
                        {factor.weight}% weight
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[0.875rem] font-bold text-ink">
                      {factor.trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-positive" />}
                      {factor.trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-negative" />}
                      {factor.score}
                      <span className="text-faint">/100</span>
                    </span>
                  </div>
                  <Bar value={factor.score} tone={factor.score >= 80 ? 'positive' : factor.score >= 60 ? 'ink' : 'negative'} />
                </div>
              ))}
            </Tile>

            {/* Pre-qualified offers */}
            <div className="lg:col-span-12">
              <div className="mb-3 flex items-center gap-2">
                <Label>Pre-qualified finance offers</Label>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.625rem] font-semibold text-accent">
                  <Sparkles className="h-3 w-3" /> AI matched
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {creditScoreData.preQualified.map((offer, i) => (
                  <Tile key={i} accent={i === 0} className="items-center gap-2 text-center">
                    {i === 0 && (
                      <span className="rounded-full bg-accent-contrast/15 px-2.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.1em] text-accent-contrast">
                        Recommended
                      </span>
                    )}
                    <Label onAccent={i === 0}>{offer.type}</Label>
                    <span className={`tnum text-[2rem] font-bold ${i === 0 ? 'text-accent-contrast' : 'text-ink'}`}>{offer.amount}</span>
                    <span className={`text-[0.8125rem] ${i === 0 ? 'text-accent-contrast/70' : 'text-muted'}`}>{offer.rate}</span>
                    <span className={`text-[0.75rem] ${i === 0 ? 'text-accent-contrast/70' : 'text-faint'}`}>{offer.provider}</span>
                    <button
                      onClick={() => showToast(`Application started for ${offer.type} — ${offer.amount}. Our team will be in touch.`, 'success')}
                      className={`mt-2 w-full rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition-opacity hover:opacity-90 ${
                        i === 0 ? 'bg-accent-contrast text-accent' : 'bg-surface-inset text-ink'
                      }`}
                    >
                      Apply now
                    </button>
                  </Tile>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 2: Benchmarking ────────────────────────────────────────── */}
      {activeTab === 2 && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-bold text-ink">Industry benchmarking</h2>
              <p className="text-[0.875rem] text-muted">Compared against 2,400+ similar SMEs.</p>
            </div>
            <Button variant="accent" onClick={fetchBenchmarking} disabled={loadingBenchmark}>
              {loadingBenchmark ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              {loadingBenchmark ? 'Analysing…' : benchmarkData !== FALLBACK_BENCHMARKS ? 'Re-benchmark' : 'Run benchmark'}
            </Button>
          </div>

          {loadingBenchmark && <Analyzing text="Benchmarking against 2,400+ SMEs…" />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {benchmarkData.map((item) => {
              const diff = item.you - item.industry;
              const above = diff > 0;
              return (
                <Tile key={item.metric} className="gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.9375rem] font-semibold text-ink">{item.metric}</span>
                    <span className={`inline-flex items-center gap-1 text-[0.8125rem] font-semibold ${above ? 'text-positive' : 'text-negative'}`}>
                      {above ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {above ? '+' : ''}
                      {diff} vs avg
                    </span>
                  </div>
                  {/* Comparison track with markers */}
                  <div className="relative h-2 w-full rounded-full bg-surface-inset">
                    <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-faint" style={{ left: `calc(${item.industry}% - 6px)` }} title="Industry" />
                    <div className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-positive" style={{ left: `calc(${item.top10}% - 6px)` }} title="Top 10%" />
                    <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-accent ring-2 ring-surface" style={{ left: `calc(${item.you}% - 8px)` }} title="You" />
                  </div>
                  <div className="flex items-center gap-5 text-[0.75rem]">
                    <span className="flex items-center gap-1.5 text-muted"><span className="h-2 w-2 rounded-full bg-accent" /> You {item.you}</span>
                    <span className="flex items-center gap-1.5 text-faint"><span className="h-2 w-2 rounded-full bg-faint" /> Industry {item.industry}</span>
                    <span className="flex items-center gap-1.5 text-positive"><span className="h-2 w-2 rounded-full bg-positive" /> Top 10% {item.top10}</span>
                  </div>
                </Tile>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Tab 3: Anomalies ───────────────────────────────────────────── */}
      {activeTab === 3 && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-bold text-ink">Anomaly detection</h2>
              <p className="text-[0.875rem] text-muted">Continuous monitoring for unusual patterns, fraud, and opportunities.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="soft" onClick={fetchAnomalies} disabled={loadingAnomalies}>
                <RefreshCw className={`h-4 w-4 ${loadingAnomalies ? 'animate-spin' : ''}`} />
                {loadingAnomalies ? 'Scanning…' : 'Rescan'}
              </Button>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-inset px-3 py-1.5 text-[0.8125rem] font-semibold text-positive">
                <ShieldCheck className="h-4 w-4" /> Shield active
              </span>
            </div>
          </div>

          {loadingAnomalies && <Analyzing text="AI scanning for anomalies…" />}

          <div className="space-y-3">
            {liveAnomalies.map((anomaly) => (
              <Tile
                key={anomaly.id}
                className={`flex-row items-center gap-4 pl-6 before:absolute before:left-0 before:top-0 before:h-full before:w-1 ${anomalyAccent(anomaly.severity)}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-inset text-muted">
                  {anomalyIcon(anomaly.type)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[0.9375rem] font-bold text-ink">{anomaly.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] ${
                        anomaly.severity === 'high' ? 'bg-accent-soft text-accent' : 'bg-surface-inset text-muted'
                      }`}
                    >
                      {anomaly.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">{anomaly.description}</p>
                  <p className="mt-1 text-[0.75rem] text-faint">Detected {anomaly.timestamp}</p>
                </div>
                <button
                  onClick={() => showToast(`${anomaly.action} — opening “${anomaly.title}”.`, 'info')}
                  className="shrink-0 rounded-full bg-surface-inset px-4 py-2 text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-surface-inset/70"
                >
                  {anomaly.action}
                </button>
              </Tile>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab 4: Forecast ────────────────────────────────────────────── */}
      {activeTab === 4 && (
        <div className="mt-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[1.25rem] font-bold text-ink">Demand forecast</h2>
              <p className="text-[0.875rem] text-muted">7-day revenue projection — actual vs predicted.</p>
            </div>
            <Button variant="soft" onClick={fetchForecast} disabled={loadingForecast}>
              <RefreshCw className={`h-4 w-4 ${loadingForecast ? 'animate-spin' : ''}`} />
              {loadingForecast ? 'Forecasting…' : 'Refresh'}
            </Button>
          </div>

          {loadingForecast && <Analyzing text="Generating demand forecast…" />}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Forecast sparkline */}
            <Tile span="lg:col-span-12" className="gap-4">
              <div className="flex items-center justify-between">
                <Label>Revenue demand forecast</Label>
                <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[0.625rem] font-semibold text-accent">
                  <Brain className="h-3 w-3" /> ML prediction
                </span>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-positive" />
                    <span className="text-[0.8125rem] text-muted">Actual</span>
                  </div>
                  <Sparkline data={actualSeries.length ? actualSeries : [0]} className="w-full text-positive" width={360} height={56} />
                </div>
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-[0.8125rem] text-muted">Predicted</span>
                  </div>
                  <Sparkline data={predictedSeries} className="w-full text-accent" width={360} height={56} />
                </div>
              </div>
              <div className="flex justify-between gap-2 border-t border-hairline pt-3">
                {forecastResult.forecast.map((f) => (
                  <div key={f.day} className="text-center">
                    <div className="text-[0.6875rem] uppercase tracking-[0.08em] text-faint">{f.day}</div>
                    <div className="tnum mt-1 text-[0.8125rem] font-semibold text-ink">{(f.predicted / 1000).toFixed(1)}k</div>
                  </div>
                ))}
              </div>
            </Tile>

            {/* Patterns */}
            <Tile span="lg:col-span-6" className="gap-4">
              <Label>Seasonal patterns detected</Label>
              {forecastResult.patterns.map((item, i) => (
                <div key={i} className="border-t border-hairline pt-3 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.9375rem] font-semibold text-ink">{item.pattern}</span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] font-bold text-accent">{item.confidence}%</span>
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-muted">{item.detail}</p>
                </div>
              ))}
            </Tile>

            {/* Reorder suggestions */}
            <Tile span="lg:col-span-6" className="gap-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-positive" />
                <Label>Smart reorder suggestions</Label>
              </div>
              {forecastResult.reorderSuggestions.map((item, i) => (
                <div key={i} className="rounded-2xl bg-surface-inset/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.9375rem] font-semibold text-ink">{item.product}</span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.6875rem] font-semibold ${
                        item.quantity === '—' ? 'bg-surface-inset text-faint' : 'bg-accent-soft text-accent'
                      }`}
                    >
                      {item.optimal}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-muted">
                    {item.quantity !== '—' && `${item.quantity} — `}
                    {item.reason}
                  </p>
                </div>
              ))}
            </Tile>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIHub;
