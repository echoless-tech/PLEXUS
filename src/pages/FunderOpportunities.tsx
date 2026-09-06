import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, ArrowRight, ShieldAlert, RefreshCw, Inbox } from 'lucide-react';
import { PageHeader, Tile, Button, Label, SegmentTabs } from '../components/ui';
import { BusinessAvatar, ContractStatusPill } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { useMilestonesFor } from '../hooks/useMilestonesFor';
import { summarise } from '../services/contracts';
import { zar, fmtDate } from '../lib/format';
import type { ContractStatus } from '../types';

const TABS: { label: string; statuses: ContractStatus[] | null }[] = [
  { label: 'All', statuses: null },
  { label: 'Awaiting buyer', statuses: ['proposed'] },
  { label: 'In progress', statuses: ['active'] },
  { label: 'Completed', statuses: ['completed'] },
];

/**
 * Payment plans — every agreement SMEs have listed for funders, with live
 * stage progress. This is the funder's version of the "Agreements" screen.
 */
const FunderOpportunities: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const opportunities = useAppStore((s) => s.opportunities);
  const businesses = useAppStore((s) => s.businesses);
  const loadOpportunities = useAppStore((s) => s.loadOpportunities);

  const [tab, setTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const { byContract, all, loading } = useMilestonesFor(opportunities);

  const verified = Boolean(profile && profile.verificationStatus !== 'unverified');
  useEffect(() => {
    if (verified) loadOpportunities().catch(() => undefined);
  }, [verified, loadOpportunities]);

  const logoFor = useMemo(() => Object.fromEntries(businesses.map((b) => [b.uid, b.logoDataUrl])), [businesses]);

  const list = useMemo(() => {
    const statuses = TABS[tab].statuses;
    return opportunities
      .filter((c) => !statuses || statuses.includes(c.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [opportunities, tab]);

  // The one number a funder acts on: buyer-approved stages not yet paid.
  const awaiting = useMemo(() => summarise(all).awaitingPayment, [all]);

  const refresh = async () => {
    setRefreshing(true);
    await loadOpportunities();
    setRefreshing(false);
  };

  if (!profile || profile.verificationStatus === 'unverified') {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Funder" title="Payment plans" />
        <Tile accent className="gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-[0.9375rem] font-semibold">Verify your institution to view listed payment plans.</p>
          </div>
          <Button variant="solid" onClick={() => navigate('/verification')}>
            Start verification <ArrowRight className="h-4 w-4" />
          </Button>
        </Tile>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Funder"
        title="Payment plans"
        subtitle="Agreements SMEs have listed for funding. Open one to follow each stage, approval and payment live."
        actions={
          <Button variant="soft" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} /> Refresh
          </Button>
        }
      />

      <Tile className="flex-row items-start gap-3 bg-surface-inset/60">
        <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <p className="text-[0.8125rem] text-muted">
          <span className="font-semibold text-ink">Where funding fits.</span> A stage marked <em>approved</em> means the
          buyer has confirmed the work but has not yet paid. That approved-but-unpaid amount is the working-capital gap
          PLEXUS lets you fill with confidence — the buyer's obligation is already on record.{' '}
          {!loading && opportunities.length > 0 && (
            <span className="font-semibold text-ink">
              {awaiting > 0 ? `Right now that gap is ${zar(awaiting, false)} across listed plans.` : 'Nothing is approved and unpaid right now.'}
            </span>
          )}
        </p>
      </Tile>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentTabs tabs={TABS.map((t) => t.label)} value={tab} onChange={setTab} className="[&>button]:whitespace-nowrap" />
        <Label>
          {list.length} plan{list.length === 1 ? '' : 's'}
          {loading ? ' · loading stages…' : ''}
        </Label>
      </div>

      {list.length === 0 ? (
        <Tile className="items-center gap-2 py-12 text-center">
          <Inbox className="h-8 w-8 text-faint" />
          <p className="text-[0.9375rem] font-semibold text-ink">No payment plans here yet</p>
          <p className="text-[0.8125rem] text-muted">SMEs tick "looking for funds" when they create or manage an agreement.</p>
        </Tile>
      ) : (
        <div className="space-y-2.5">
          {list.map((c) => {
            const ms = byContract[c.id] || [];
            const s = summarise(ms);
            const paidStages = ms.filter((m) => m.status === 'paid').length;
            return (
              <Tile key={c.id} interactive as="button" onClick={() => navigate(`/contracts/${c.id}`)} className="w-full flex-row flex-wrap items-center gap-3 !py-4 text-left">
                <BusinessAvatar name={c.smeName} logoDataUrl={logoFor[c.smeUid]} size={44} rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.title}</p>
                    <ContractStatusPill status={c.status} />
                  </div>
                  <p className="truncate text-[0.8125rem] text-muted">
                    <span
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/funder/sme/${c.smeUid}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          navigate(`/funder/sme/${c.smeUid}`);
                        }
                      }}
                      className="cursor-pointer font-medium text-ink hover:text-accent"
                    >
                      {c.smeName}
                    </span>
                    {' → '}
                    {c.buyerName || 'Invited buyer'} · {c.milestoneCount} stages · delivery {fmtDate(c.expectedDelivery)}
                    {ms.length ? ` · ${paidStages}/${ms.length} paid` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tnum text-[1rem] font-bold text-ink">{zar(c.totalValue, false)}</p>
                  <p className="text-[0.75rem] text-muted">{s.awaitingPayment ? <span className="text-accent">{zar(s.awaitingPayment, false)} approved</span> : `${zar(s.paid, false)} paid`}</p>
                </div>
                <ArrowRight className="hidden h-4 w-4 shrink-0 text-faint sm:block" />
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
                  <div className="h-full rounded-full bg-positive" style={{ width: `${c.totalValue ? Math.min(100, (s.paid / c.totalValue) * 100) : 0}%` }} />
                </div>
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FunderOpportunities;
