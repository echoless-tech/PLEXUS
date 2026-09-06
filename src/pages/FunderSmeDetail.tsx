import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, Landmark, ShieldCheck, Copy, ArrowRight, Lock } from 'lucide-react';
import { Tile, Button, Label, Metric } from '../components/ui';
import { BusinessAvatar, RatingStars, VerificationBadge, ContractStatusPill } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { fetchProfile } from '../services/profile';
import { fetchSmeFundingContracts, summarise } from '../services/contracts';
import { useMilestonesFor } from '../hooks/useMilestonesFor';
import { computeRating } from '../lib/rating';
import { zar, fmtDate } from '../lib/format';
import { INDUSTRY_LABELS, type ContractView, type PublicProfile } from '../types';

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

/**
 * Funder view of one SME: public profile, rating and statistics derived from
 * the agreements that SME has listed for funders, and the plans themselves.
 * Unlisted agreements and bank details are unreadable by rule, so they simply
 * do not appear here.
 */
const FunderSmeDetail: React.FC = () => {
  const { uid = '' } = useParams();
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);
  const me = useAppStore((s) => s.profile);

  const [sme, setSme] = useState<PublicProfile | null>(null);
  const [plans, setPlans] = useState<ContractView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, cs] = await Promise.all([fetchProfile(uid), fetchSmeFundingContracts(uid).catch(() => [] as ContractView[])]);
        if (cancelled) return;
        if (!p || p.accountType !== 'business') setError('That business could not be found.');
        setSme(p);
        setPlans(cs);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Could not load this business.');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const { byContract, all, loading } = useMilestonesFor(plans);
  const rating = useMemo(() => computeRating(plans, all), [plans, all]);
  const money = useMemo(() => summarise(all), [all]);
  const open = plans.filter((c) => c.status === 'proposed' || c.status === 'active');

  const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => showToast('Copied.', 'success')).catch(() => undefined);

  if (!ready) return <div className="flex h-[40vh] items-center justify-center text-sm text-muted">Loading business…</div>;

  if (error || !sme) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Tile className="items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-muted" />
          <p className="text-lg font-semibold text-ink">{error || 'Business not found'}</p>
          <Button variant="soft" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" /> Back to SMEs
          </Button>
        </Tile>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="py-6">
        <button onClick={() => navigate('/')} className="mb-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> SMEs
        </button>
        <div className="flex flex-wrap items-start gap-4">
          <BusinessAvatar name={sme.businessName} logoDataUrl={sme.logoDataUrl} size={80} rounded="rounded-3xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.875rem]">{sme.businessName}</h1>
              <VerificationBadge status={sme.verificationStatus} />
              {open.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-accent-contrast">
                  <Landmark className="h-3 w-3" /> Looking for funds
                </span>
              )}
            </div>
            <p className="mt-1 text-[0.875rem] text-muted">
              {sme.industry ? INDUSTRY_LABELS[sme.industry] : 'Industry not specified'}
              {sme.location ? ` · ${sme.location}` : ''} · on PLEXUS since {fmtDate(sme.createdAt)}
            </p>
            <RatingStars rating={rating} size={16} className="mt-2" />
          </div>
          <div className="flex flex-wrap gap-2">
            {sme.publicEmail && (
              <Button variant="accent" onClick={() => copy(sme.publicEmail)}>
                <Mail className="h-4 w-4" /> {sme.publicEmail} <Copy className="h-3.5 w-3.5 opacity-70" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── About ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Tile className="gap-2">
          <Label>About</Label>
          <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-muted">{sme.description || 'This business has not written a description yet.'}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-muted">
            {sme.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {sme.location}
              </span>
            )}
            {sme.publicEmail && (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {sme.publicEmail}
              </span>
            )}
          </div>
        </Tile>
        <Tile className="gap-2">
          <Label>How this rating is built</Label>
          <p className="text-[0.8125rem] leading-relaxed text-muted">
            40% stages paid · 25% agreements completed vs cancelled · 20% stages approved by the buyer first time · 15%
            dispute-free. Only agreements {sme.businessName} has listed for funders are counted, and every input is a
            buyer-confirmed, server-timestamped event.
          </p>
          <p className="flex items-center gap-1.5 text-[0.75rem] text-faint">
            <ShieldCheck className="h-3.5 w-3.5" /> Viewing as {me?.businessName}. Read-only.
          </p>
        </Tile>
      </div>

      {/* ── Statistics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric label="Listed agreements" value={String(rating.agreementsTotal)} hint={`${rating.agreementsActive} active · ${rating.agreementsCompleted} completed`} />
        <Metric label="Stages paid" value={`${rating.milestonesPaid} / ${rating.milestonesTotal}`} hint="buyer-confirmed" />
        <Metric label="Received" value={zar(rating.valuePaid, false)} hint={`of ${zar(rating.valueContracted, false)} contracted`} accent={money.awaitingPayment > 0} />
        <Metric label="Approved first time" value={pct(rating.firstTimeApprovalRate)} hint={`${rating.rejectionsReceived} returned · ${rating.disputesRaised} disputed`} critical={rating.disputesRaised > 0} />
      </div>

      {/* ── Payment plans ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Listed payment plans</Label>
          {loading && <span className="text-[0.75rem] text-faint">Loading stages…</span>}
        </div>
        {plans.length === 0 ? (
          <Tile className="items-center gap-2 py-12 text-center">
            <Landmark className="h-8 w-8 text-faint" />
            <p className="text-[0.9375rem] font-semibold text-ink">Nothing listed for funders</p>
            <p className="max-w-sm text-[0.8125rem] text-muted">
              {sme.businessName} has not marked any payment plan as looking for funds. Their rating will appear once they do.
            </p>
          </Tile>
        ) : (
          <div className="space-y-2.5">
            {plans.map((c) => {
              const ms = byContract[c.id] || [];
              const s = summarise(ms);
              const paidStages = ms.filter((m) => m.status === 'paid').length;
              return (
                <Tile key={c.id} interactive as="button" onClick={() => navigate(`/contracts/${c.id}`)} className="w-full flex-row flex-wrap items-center gap-3 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.title}</p>
                      <ContractStatusPill status={c.status} />
                    </div>
                    <p className="text-[0.75rem] text-muted">
                      Buyer: {c.buyerName || 'Invited'} · {c.milestoneCount} stages · delivery {fmtDate(c.expectedDelivery)}
                      {ms.length ? ` · ${paidStages}/${ms.length} paid` : ''}
                      {s.awaitingPayment ? ` · ${zar(s.awaitingPayment, false)} approved, awaiting payment` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tnum text-[1rem] font-bold text-ink">{zar(c.totalValue, false)}</p>
                    <p className="text-[0.75rem] text-muted">{zar(s.paid, false)} paid</p>
                  </div>
                  <ArrowRight className="hidden h-4 w-4 text-faint sm:block" />
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                    <div className="h-full rounded-full bg-positive" style={{ width: `${c.totalValue ? Math.min(100, (s.paid / c.totalValue) * 100) : 0}%` }} />
                  </div>
                </Tile>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FunderSmeDetail;
