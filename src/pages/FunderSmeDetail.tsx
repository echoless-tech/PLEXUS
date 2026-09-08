import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Mail, Landmark, Copy, ArrowRight, Lock, Check, Loader2, Undo2, Info } from 'lucide-react';
import { Tile, Button, Label, StatRow } from '../components/ui';
import { BusinessAvatar, RatingStars, VerificationBadge, ContractStatusPill } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { fetchProfile } from '../services/profile';
import { fetchSmeFundingContracts, summarise } from '../services/contracts';
import { canOffer, offerFunding, withdrawFunding } from '../services/funding';
import { useMilestonesFor } from '../hooks/useMilestonesFor';
import { computeRating, displayRating } from '../lib/rating';
import { zar, fmtDate, fmtDateTime } from '../lib/format';
import { INDUSTRY_LABELS, type ContractView, type Funding, type PublicProfile } from '../types';

const pct = (n: number | null) => (n === null ? '—' : `${Math.round(n * 100)}%`);

const FUNDING_CHIP: Record<Funding['status'], { text: string; cls: string }> = {
  offered: { text: 'Offer sent', cls: 'bg-accent-soft text-accent' },
  accepted: { text: 'Funding', cls: 'bg-positive/15 text-positive' },
  declined: { text: 'Declined', cls: 'bg-negative/10 text-negative' },
  withdrawn: { text: 'Withdrawn', cls: 'bg-surface-inset text-muted' },
};

/**
 * Funder view of one SME: public profile, rating and statistics derived from
 * the business's live agreements, and the plans themselves — with the funder
 * choosing exactly which payment plans to fund. Selection is per plan: an
 * agreement the business creates later shows up as "available", never as
 * already-funded.
 */
const FunderSmeDetail: React.FC = () => {
  const { uid = '' } = useParams();
  const navigate = useNavigate();
  const showToast = useAppStore((s) => s.showToast);
  const me = useAppStore((s) => s.profile);
  const fundings = useAppStore((s) => s.fundings);
  const loadFundings = useAppStore((s) => s.loadFundings);

  const [sme, setSme] = useState<PublicProfile | null>(null);
  const [plans, setPlans] = useState<ContractView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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
  const rating = useMemo(() => displayRating(computeRating(plans, all), sme ?? {}), [plans, all, sme]);
  const money = useMemo(() => summarise(all), [all]);

  // My funding record per plan (the id is `${contractId}_${myUid}`, so at most one each).
  const mineByPlan = useMemo(() => {
    const out: Record<string, Funding> = {};
    for (const f of fundings) if (f.smeUid === uid) out[f.contractId] = f;
    return out;
  }, [fundings, uid]);
  const isSelectable = (c: ContractView) => (c.status === 'proposed' || c.status === 'active') && canOffer(mineByPlan[c.id]);
  const selectable = plans.filter(isSelectable);
  const fundingCount = plans.filter((c) => mineByPlan[c.id]?.status === 'accepted').length;

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const fundSelected = async () => {
    const chosen = plans.filter((c) => selected.has(c.id) && isSelectable(c));
    if (!chosen.length) return;
    setBusy(true);
    try {
      for (const c of chosen) await offerFunding(c, me?.businessName || 'Funder');
      await loadFundings();
      setSelected(new Set());
      showToast(`Offered to fund ${chosen.length} plan${chosen.length === 1 ? '' : 's'}. ${sme?.businessName} will accept or decline each.`, 'success');
    } catch (e: any) {
      showToast(e?.code === 'permission-denied' ? 'Not allowed — the business may have closed to funding, or your verification is pending.' : e?.message || 'Could not send offer.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async (f: Funding) => {
    setBusy(true);
    try {
      await withdrawFunding(f);
      await loadFundings();
      showToast('Offer withdrawn.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not withdraw.', 'error');
    } finally {
      setBusy(false);
    }
  };

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
              {sme.seekingFunding && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-accent-contrast">
                  <Landmark className="h-3 w-3" /> Looking for funding
                </span>
              )}
              {fundingCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-positive/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-positive">
                  <Check className="h-3 w-3" /> You fund {fundingCount} plan{fundingCount === 1 ? '' : 's'}
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

      {/* ── Statistics (from listed agreements only) ───────────────── */}
      <StatRow
        stats={[
          {
            label: 'Listed agreements',
            value: String(rating.agreementsTotal),
            hint: `${rating.agreementsActive} active · ${rating.agreementsCompleted} completed`,
          },
          { label: 'Stages paid', value: `${rating.milestonesPaid} / ${rating.milestonesTotal}`, hint: 'buyer-confirmed' },
          {
            label: 'Received',
            value: zar(rating.valuePaid, false),
            hint: money.awaitingPayment > 0 ? `${zar(money.awaitingPayment, false)} approved, unpaid` : `of ${zar(rating.valueContracted, false)} contracted`,
            accent: money.awaitingPayment > 0,
          },
          {
            label: 'Approved first time',
            value: pct(rating.firstTimeApprovalRate),
            hint: `${rating.rejectionsReceived} returned · ${rating.disputesRaised} disputed`,
            accent: rating.disputesRaised > 0,
          },
        ]}
      />

      {/* ── Payment plans — choose which to fund ──────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Payment plans · choose which to fund</Label>
          <span className="text-[0.75rem] text-faint">
            {loading ? 'Loading stages…' : `${plans.length} plan${plans.length === 1 ? '' : 's'} · ${selectable.length} available`}
          </span>
        </div>

        {!sme.seekingFunding ? (
          <Tile className="items-center gap-2 py-12 text-center">
            <Lock className="h-8 w-8 text-faint" />
            <p className="text-[0.9375rem] font-semibold text-ink">{sme.businessName} is not looking for funding</p>
            <p className="max-w-sm text-[0.8125rem] text-muted">
              Their agreements are hidden from funders until they switch on "Look for funding". Any plans you already fund stay in place.
            </p>
          </Tile>
        ) : plans.length === 0 ? (
          <Tile className="items-center gap-2 py-12 text-center">
            <Landmark className="h-8 w-8 text-faint" />
            <p className="text-[0.9375rem] font-semibold text-ink">No live payment plans yet</p>
            <p className="max-w-sm text-[0.8125rem] text-muted">
              {sme.businessName} is open to funding but has no proposed or active agreements right now. Check back later.
            </p>
          </Tile>
        ) : (
          <>
            <div className="space-y-2.5">
              {plans.map((c) => {
                const ms = byContract[c.id] || [];
                const s = summarise(ms);
                const paidStages = ms.filter((m) => m.status === 'paid').length;
                const mine = mineByPlan[c.id];
                const canSelect = isSelectable(c);
                const checked = selected.has(c.id);
                return (
                  <Tile
                    key={c.id}
                    className={
                      'flex-row flex-wrap items-center gap-3 transition-shadow ' +
                      (checked ? 'ring-2 ring-accent' : mine?.status === 'accepted' ? 'ring-1 ring-positive/40' : '')
                    }
                  >
                    {/* Selection control */}
                    {canSelect ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`Select ${c.title}`}
                        onClick={() => toggle(c.id)}
                        style={checked ? { background: 'var(--accent)', color: 'var(--accent-contrast)' } : { background: 'var(--surface-inset)' }}
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors"
                      >
                        {checked && <Check className="h-4 w-4" />}
                      </button>
                    ) : (
                      <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (mine?.status === 'accepted' ? 'bg-positive/15 text-positive' : 'bg-surface-inset text-muted')}>
                        <Landmark className="h-4 w-4" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.title}</p>
                        <ContractStatusPill status={c.status} />
                        {mine && (
                          <span className={'rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ' + FUNDING_CHIP[mine.status].cls}>
                            {FUNDING_CHIP[mine.status].text}
                          </span>
                        )}
                      </div>
                      <p className="text-[0.75rem] text-muted">
                        Buyer: {c.buyerName || 'Invited'} · {c.milestoneCount} stages · delivery {fmtDate(c.expectedDelivery)}
                        {ms.length ? ` · ${paidStages}/${ms.length} paid` : ''}
                        {s.awaitingPayment ? ` · ${zar(s.awaitingPayment, false)} approved, awaiting payment` : ''}
                        {mine?.status === 'offered' ? ` · offered ${fmtDateTime(mine.createdAt)}` : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="tnum text-[1rem] font-bold text-ink">{zar(c.totalValue, false)}</p>
                      <p className="text-[0.75rem] text-muted">{zar(s.paid, false)} paid</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {mine?.status === 'offered' && (
                        <Button variant="soft" disabled={busy} onClick={() => withdraw(mine)} title="Withdraw this offer">
                          <Undo2 className="h-4 w-4" /> Withdraw
                        </Button>
                      )}
                      <Button variant="soft" onClick={() => navigate(`/contracts/${c.id}`)} title="Open the live agreement">
                        View <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                      <div className="h-full rounded-full bg-positive" style={{ width: `${c.totalValue ? Math.min(100, (s.paid / c.totalValue) * 100) : 0}%` }} />
                    </div>
                  </Tile>
                );
              })}
            </div>

            {/* Action bar */}
            <Tile className="flex-row flex-wrap items-center gap-3">
              <Info className="h-4 w-4 shrink-0 text-muted" />
              <p className="min-w-0 flex-1 text-[0.8125rem] text-muted">
                Only the plans you select are offered. If {sme.businessName} creates new agreements later, they appear here as
                available — nothing is added to your funding automatically.
              </p>
              <Button variant="accent" disabled={busy || selected.size === 0} onClick={fundSelected}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
                Fund {selected.size > 0 ? `${selected.size} selected plan${selected.size === 1 ? '' : 's'}` : 'selected plans'}
              </Button>
            </Tile>
          </>
        )}
      </div>
    </div>
  );
};

export default FunderSmeDetail;
