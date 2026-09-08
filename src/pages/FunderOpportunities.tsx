import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldAlert, RefreshCw, Inbox, Landmark, Undo2, Loader2, Check } from 'lucide-react';
import { PageHeader, Tile, Button, Label, SegmentTabs } from '../components/ui';
import { BusinessAvatar, ContractStatusPill } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { useMilestonesFor } from '../hooks/useMilestonesFor';
import { summarise } from '../services/contracts';
import { canOffer, offerFunding, withdrawFunding } from '../services/funding';
import { zar, fmtDate, fmtDateTime } from '../lib/format';
import type { ContractView, Funding } from '../types';

const TABS = ['Funding', 'Offers sent', 'Available', 'Closed'] as const;

const CHIP: Record<Funding['status'], { text: string; cls: string }> = {
  offered: { text: 'Offer sent', cls: 'bg-accent-soft text-accent' },
  accepted: { text: 'Funding', cls: 'bg-positive/15 text-positive' },
  declined: { text: 'Declined', cls: 'bg-negative/10 text-negative' },
  withdrawn: { text: 'Withdrawn', cls: 'bg-surface-inset text-muted' },
};

/**
 * Payment plans — the funder's portfolio. "Funding" and "Offers sent" are the
 * plans this funder explicitly chose; "Available" is every live plan of a
 * business that is open to funding and that this funder has NOT chosen. New
 * agreements a business creates land in Available, never in Funding.
 */
const FunderOpportunities: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const opportunities = useAppStore((s) => s.opportunities);
  const businesses = useAppStore((s) => s.businesses);
  const fundings = useAppStore((s) => s.fundings);
  const loadBusinesses = useAppStore((s) => s.loadBusinesses);
  const loadOpportunities = useAppStore((s) => s.loadOpportunities);
  const loadFundings = useAppStore((s) => s.loadFundings);
  const showToast = useAppStore((s) => s.showToast);

  const [tab, setTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { byContract, loading } = useMilestonesFor(opportunities);

  const verified = Boolean(profile && profile.verificationStatus !== 'unverified');
  useEffect(() => {
    if (verified) loadBusinesses().then(() => Promise.all([loadOpportunities(), loadFundings()])).catch(() => undefined);
  }, [verified, loadBusinesses, loadOpportunities, loadFundings]);

  const logoFor = useMemo(() => Object.fromEntries(businesses.map((b) => [b.uid, b.logoDataUrl])), [businesses]);
  const nameFor = useMemo(() => Object.fromEntries(businesses.map((b) => [b.uid, b.businessName])), [businesses]);
  const byPlan = useMemo(() => Object.fromEntries(fundings.map((f) => [f.contractId, f])), [fundings]);
  const planById = useMemo(() => Object.fromEntries(opportunities.map((c) => [c.id, c])), [opportunities]);

  // Rows for the funding/offer/closed tabs come from my funding records so they
  // survive the business closing to funding; the plan itself may then be unreadable.
  const rows = useMemo(() => {
    const live = (c: ContractView) => c.status === 'proposed' || c.status === 'active';
    const fromFundings = (statuses: Funding['status'][]) =>
      fundings
        .filter((f) => statuses.includes(f.status))
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .map((f) => ({ key: f.id, funding: f, plan: planById[f.contractId] as ContractView | undefined }));
    switch (tab) {
      case 0:
        return fromFundings(['accepted']);
      case 1:
        return fromFundings(['offered']);
      case 2:
        return opportunities
          .filter((c) => live(c) && canOffer(byPlan[c.id]))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
          .map((c) => ({ key: c.id, funding: byPlan[c.id] as Funding | undefined, plan: c as ContractView | undefined }));
      default:
        return fromFundings(['declined', 'withdrawn']);
    }
  }, [tab, fundings, opportunities, byPlan, planById]);

  const counts = useMemo(
    () => [
      fundings.filter((f) => f.status === 'accepted').length,
      fundings.filter((f) => f.status === 'offered').length,
      opportunities.filter((c) => (c.status === 'proposed' || c.status === 'active') && canOffer(byPlan[c.id])).length,
      fundings.filter((f) => f.status === 'declined' || f.status === 'withdrawn').length,
    ],
    [fundings, opportunities, byPlan],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadBusinesses();
      await Promise.all([loadOpportunities(), loadFundings()]);
    } finally {
      setRefreshing(false);
    }
  };

  const fund = async (c: ContractView) => {
    setBusyId(c.id);
    try {
      await offerFunding(c, profile?.businessName || 'Funder');
      await loadFundings();
      showToast(`Offer sent to ${c.smeName}. They will accept or decline.`, 'success');
    } catch (e: any) {
      showToast(e?.code === 'permission-denied' ? 'Not allowed — the business may have closed to funding, or your verification is pending.' : e?.message || 'Could not send offer.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const withdraw = async (f: Funding) => {
    setBusyId(f.contractId);
    try {
      await withdrawFunding(f);
      await loadFundings();
      showToast('Offer withdrawn.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not withdraw.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (!profile || profile.verificationStatus === 'unverified') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Funder" title="Payment plans" />
        <Tile accent className="gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[0.9375rem] font-semibold">Verify your institution to view and fund payment plans.</p>
          </div>
          <Button variant="solid" onClick={() => navigate('/verification')}>
            Start verification <ArrowRight className="h-4 w-4" />
          </Button>
        </Tile>
      </div>
    );
  }

  const empty: Record<number, { title: string; body: string }> = {
    0: { title: 'You are not funding any plans yet', body: 'Offers you send become funded plans once the business accepts them.' },
    1: { title: 'No offers waiting', body: 'Choose plans under Available, or from a business page, to send an offer.' },
    2: { title: 'Nothing available right now', body: 'Live plans of businesses that are looking for funding appear here as they are created.' },
    3: { title: 'No closed offers', body: 'Declined and withdrawn offers are kept here for your records.' },
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Funder"
        title="Payment plans"
        actions={
          <Button variant="soft" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs tabs={TABS.map((t, i) => `${t} (${counts[i]})`)} value={tab} onChange={setTab} className="[&>button]:whitespace-nowrap" />
        <Label>
          {rows.length} plan{rows.length === 1 ? '' : 's'}
          {loading ? ' · loading stages…' : ''}
        </Label>
      </div>

      {rows.length === 0 ? (
        <Tile className="items-center gap-2 py-12 text-center">
          <Inbox className="h-8 w-8 text-faint" />
          <p className="text-[0.9375rem] font-semibold text-ink">{empty[tab].title}</p>
          <p className="text-[0.8125rem] text-muted">{empty[tab].body}</p>
        </Tile>
      ) : (
        <div className="space-y-2.5">
          {rows.map(({ key, funding, plan }) => {
            const c = plan;
            const ms = c ? byContract[c.id] || [] : [];
            const s = summarise(ms);
            const paidStages = ms.filter((m) => m.status === 'paid').length;
            const smeUid = c?.smeUid ?? funding?.smeUid ?? '';
            const smeName = c?.smeName || nameFor[smeUid] || 'Business';
            const title = c?.title ?? funding?.contractTitle ?? 'Agreement';
            const contractId = c?.id ?? funding?.contractId ?? '';
            const busy = busyId === contractId;
            return (
              <Tile key={key} className={'flex-row flex-wrap items-center gap-3 !py-4 ' + (funding?.status === 'accepted' ? 'ring-1 ring-positive/40' : '')}>
                <BusinessAvatar name={smeName} logoDataUrl={logoFor[smeUid]} size={44} rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[0.9375rem] font-semibold text-ink">{title}</p>
                    {c && <ContractStatusPill status={c.status} />}
                    {funding && (
                      <span className={'rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] ' + CHIP[funding.status].cls}>
                        {CHIP[funding.status].text}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[0.8125rem] text-muted">
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={() => navigate(`/funder/sme/${smeUid}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') navigate(`/funder/sme/${smeUid}`);
                      }}
                      className="cursor-pointer font-medium text-ink hover:text-accent"
                    >
                      {smeName}
                    </span>
                    {c ? (
                      <>
                        {' → '}
                        {c.buyerName || 'Invited buyer'} · {c.milestoneCount} stages · delivery {fmtDate(c.expectedDelivery)}
                        {ms.length ? ` · ${paidStages}/${ms.length} paid` : ''}
                      </>
                    ) : (
                      <> · agreement no longer visible to funders</>
                    )}
                    {funding?.status === 'offered' ? ` · offered ${fmtDateTime(funding.createdAt)}` : ''}
                    {funding?.status === 'accepted' && funding.respondedAt ? ` · accepted ${fmtDateTime(funding.respondedAt)}` : ''}
                  </p>
                </div>
                {c && (
                  <div className="text-right">
                    <p className="tnum text-[1rem] font-bold text-ink">{zar(c.totalValue, false)}</p>
                    <p className="text-[0.75rem] text-muted">{s.awaitingPayment ? <span className="text-accent">{zar(s.awaitingPayment, false)} approved</span> : `${zar(s.paid, false)} paid`}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  {canOffer(funding) && c && (c.status === 'proposed' || c.status === 'active') && (
                    <Button variant="accent" disabled={busy} onClick={() => fund(c)} title={funding ? 'Offer to fund this plan again' : 'Offer to fund this plan'}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />} {funding ? 'Fund again' : 'Fund'}
                    </Button>
                  )}
                  {funding?.status === 'offered' && (
                    <Button variant="soft" disabled={busy} onClick={() => withdraw(funding)} title="Withdraw this offer">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Withdraw
                    </Button>
                  )}
                  {funding?.status === 'accepted' && (
                    <span className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-positive">
                      <Check className="h-4 w-4" /> Funded
                    </span>
                  )}
                  {c && (
                    <Button variant="soft" onClick={() => navigate(`/contracts/${c.id}`)} title="Open the live agreement">
                      View <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {c && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                    <div className="h-full rounded-full bg-positive" style={{ width: `${c.totalValue ? Math.min(100, (s.paid / c.totalValue) * 100) : 0}%` }} />
                  </div>
                )}
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FunderOpportunities;
