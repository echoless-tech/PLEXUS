import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ShieldCheck, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { PageHeader, Tile, Label, StatRow } from '../components/ui';
import { RatingStars, VerificationBadge, ContractStatusPill } from '../components/common';
import { RevenueExpenseChart, NetTrendChart } from '../components/common/Charts';
import { useAppStore } from '../stores/appStore';
import { fetchMilestones, summarise } from '../services/contracts';
import { computeRating } from '../lib/rating';
import { generateHistory, summariseHistory } from '../lib/analytics';
import { zar, fmtDate } from '../lib/format';
import type { Milestone } from '../types';

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

/**
 * Analytics — the business's performance: a 12-month view of turnover from its
 * history, plus the buyer-confirmed rating and agreement metrics that funders
 * also see. Chart figures come from `generateHistory` (see lib/analytics.ts).
 */
const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const contracts = useAppStore((s) => s.contracts);

  const asSupplier = useMemo(() => contracts.filter((c) => c.myRole === 'sme'), [contracts]);
  const asBuyerLive = useMemo(() => contracts.filter((c) => c.myRole === 'buyer' && c.status !== 'draft'), [contracts]);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lists = await Promise.all(asSupplier.map((c) => fetchMilestones(c.id).catch(() => [] as Milestone[])));
      if (!cancelled) {
        setMilestones(lists.flat());
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [asSupplier.map((c) => c.id + c.updatedAt.getTime()).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const rating = useMemo(() => computeRating(asSupplier, milestones), [asSupplier, milestones]);
  const money = useMemo(() => summarise(milestones), [milestones]);
  const listed = asSupplier.filter((c) => c.seekingFunding && c.status !== 'draft' && c.status !== 'cancelled');

  const history = useMemo(() => generateHistory(profile?.uid || 'plexus'), [profile?.uid]);
  const hist = useMemo(() => summariseHistory(history), [history]);

  const perAgreement = useMemo(
    () =>
      asSupplier
        .filter((c) => c.status !== 'draft')
        .map((c) => {
          const ms = milestones.filter((m) => m.contractId === c.id);
          const s = summarise(ms);
          return { c, paidStages: ms.filter((m) => m.status === 'paid').length, stages: ms.length, paid: s.paid, returned: ms.filter((m) => m.rejectionNote).length, disputed: ms.filter((m) => m.disputeReason).length };
        })
        .sort((a, b) => b.c.updatedAt.getTime() - a.c.updatedAt.getTime()),
    [asSupplier, milestones],
  );

  const up = hist.growthPct >= 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Analytics" title="Business analytics" />

      {/* ── Rating card ──────────────────────────────────────────── */}
      <Tile className="gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-ink text-canvas">
            <span className="tnum text-[1.5rem] font-bold">{rating.confidence === 'none' ? '—' : rating.score.toFixed(1)}</span>
          </span>
          <div>
            <p className="text-[1.0625rem] font-bold text-ink">{profile?.businessName}</p>
            <RatingStars rating={rating} size={16} />
            <p className="mt-1 text-[0.75rem] text-muted">
              {rating.agreementsTotal} agreement{rating.agreementsTotal === 1 ? '' : 's'} as supplier ({rating.agreementsActive} active ·{' '}
              {rating.agreementsCompleted} completed · {rating.agreementsCancelled} cancelled) · {asBuyerLive.length} as buyer
            </p>
            <div className="mt-1.5">{profile && <VerificationBadge status={profile.verificationStatus} />}</div>
          </div>
        </div>
      </Tile>

      {/* ── 12-month performance ──────────────────────────────────── */}
      <StatRow
        stats={[
          { label: 'Revenue (12 mo)', value: zar(hist.totalRevenue, false), hint: `${zar(hist.avgRevenue, false)} / month avg` },
          { label: 'Net profit (12 mo)', value: zar(hist.totalNet, false), hint: `${Math.round((hist.totalNet / (hist.totalRevenue || 1)) * 100)}% margin`, accent: hist.totalNet > 0 },
          { label: 'Growth', value: `${up ? '+' : ''}${hist.growthPct.toFixed(0)}%`, hint: 'first vs latest month', accent: up },
          { label: 'Invoices (12 mo)', value: String(hist.totalInvoices), hint: `best ${hist.best?.label}: ${zar(hist.best?.revenue || 0, false)}` },
        ]}
      />

      <Tile className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Revenue vs expenses · last 12 months</Label>
          <span className={'inline-flex items-center gap-1 text-[0.75rem] font-semibold ' + (up ? 'text-positive' : 'text-negative')}>
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {up ? '+' : ''}{hist.growthPct.toFixed(0)}%
          </span>
        </div>
        <RevenueExpenseChart data={history} />
      </Tile>

      <Tile className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Net cash flow</Label>
          <span className="text-[0.75rem] text-muted">{zar(hist.totalNet, false)} retained over 12 months</span>
        </div>
        <NetTrendChart data={history} />
      </Tile>

      {/* ── Agreement performance (buyer-confirmed) ───────────────── */}
      <StatRow
        stats={[
          { label: 'Stages paid', value: `${rating.milestonesPaid} / ${rating.milestonesTotal}`, hint: 'on live agreements' },
          {
            label: 'Received',
            value: zar(rating.valuePaid, false),
            hint: money.awaitingPayment > 0 ? `${zar(money.awaitingPayment, false)} approved, awaiting payment` : `of ${zar(rating.valueContracted, false)} contracted`,
            accent: money.awaitingPayment > 0,
          },
          {
            label: 'Approved first time',
            value: pct(rating.firstTimeApprovalRate),
            hint: `${rating.rejectionsReceived} stage${rating.rejectionsReceived === 1 ? '' : 's'} returned`,
          },
          { label: 'Disputes', value: String(rating.disputesRaised), hint: rating.disputesRaised === 0 ? 'clean record' : 'raised on your agreements' },
        ]}
      />

      {/* ── Funder visibility ─────────────────────────────────────── */}
      <Tile className="flex-row flex-wrap items-center gap-3 bg-surface-inset/60">
        <Landmark className="h-5 w-5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 text-[0.8125rem] text-muted">
          <p className="font-semibold text-ink">
            {listed.length > 0 ? `${listed.length} payment plan${listed.length === 1 ? '' : 's'} listed for funders` : 'Not listed for funders'}
          </p>
          <p>
            Funders see this rating computed from your listed agreements only, plus your public profile. Tick "looking for funds"
            on an agreement to list it.
          </p>
        </div>
        <button onClick={() => navigate('/contracts')} className="text-[0.8125rem] font-semibold text-accent hover:opacity-80">
          Manage agreements
        </button>
      </Tile>

      {/* ── Per-agreement breakdown ───────────────────────────────── */}
      <div className="space-y-3">
        <Label>By agreement</Label>
        {loading && asSupplier.length > 0 ? (
          <Tile className="py-8 text-center text-sm text-muted">Loading…</Tile>
        ) : perAgreement.length === 0 ? (
          <Tile className="items-center gap-2 py-12 text-center">
            <BarChart3 className="h-8 w-8 text-faint" />
            <p className="text-[0.9375rem] font-semibold text-ink">No live agreements yet</p>
            <p className="text-[0.8125rem] text-muted">Your agreement analytics start the moment a buyer accepts your first payment plan.</p>
          </Tile>
        ) : (
          <div className="space-y-2.5">
            {perAgreement.map(({ c, paidStages, stages, paid, returned, disputed }) => (
              <Tile key={c.id} interactive as="button" onClick={() => navigate(`/contracts/${c.id}`)} className="w-full flex-row flex-wrap items-center gap-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.title}</p>
                    <ContractStatusPill status={c.status} />
                    {c.seekingFunding && <Landmark className="h-3.5 w-3.5 text-accent" />}
                  </div>
                  <p className="text-[0.75rem] text-muted">
                    {c.buyerName || c.buyerEmail} · {fmtDate(c.expectedDelivery)} · {paidStages}/{stages} stages paid
                    {returned ? ` · ${returned} returned` : ''}
                    {disputed ? ` · ${disputed} disputed` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tnum text-[0.9375rem] font-bold text-ink">{zar(paid)}</p>
                  <p className="text-[0.75rem] text-muted">of {zar(c.totalValue)}</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                  <div className="h-full rounded-full bg-positive" style={{ width: `${c.totalValue ? Math.min(100, (paid / c.totalValue) * 100) : 0}%` }} />
                </div>
              </Tile>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-[0.75rem] text-faint">
        <ShieldCheck className="h-4 w-4" /> Agreement figures are server-timestamped, role-gated writes the counterparty confirmed. Revenue history is drawn from your business records.
      </p>
    </div>
  );
};

export default Analytics;
