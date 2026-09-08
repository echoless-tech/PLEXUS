import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, ArrowRight, MapPin, Landmark, Users, RefreshCw, CalendarDays, BadgeCheck, Check } from 'lucide-react';
import { PageHeader, Tile, Button, Label, SegmentTabs } from '../components/ui';
import { RatingStars, SquareMedia } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { useMilestonesFor } from '../hooks/useMilestonesFor';
import { computeRating, displayRating } from '../lib/rating';
import { fmtDate } from '../lib/format';
import { INDUSTRY_LABELS, type BusinessRating, type PublicProfile } from '../types';

const fieldCls =
  'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none';

/**
 * Funder home — every business on PLEXUS with logo, verification and a rating
 * derived from the live agreements of businesses that are open to funding.
 * Firestore only lets a verified funder read agreements of businesses whose
 * profile says `seekingFunding`, so ratings here are exactly as trustworthy as
 * the underlying buyer-confirmed data. Funding a plan is an explicit choice
 * made on the SME page — never inferred from what the SME creates.
 */
const FunderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const businesses = useAppStore((s) => s.businesses);
  const opportunities = useAppStore((s) => s.opportunities);
  const fundings = useAppStore((s) => s.fundings);
  const loadBusinesses = useAppStore((s) => s.loadBusinesses);
  const loadOpportunities = useAppStore((s) => s.loadOpportunities);
  const loadFundings = useAppStore((s) => s.loadFundings);

  const [q, setQ] = useState('');
  const [tab, setTab] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const verified = Boolean(profile && profile.verificationStatus !== 'unverified');
  useEffect(() => {
    if (verified) loadBusinesses().then(() => Promise.all([loadOpportunities(), loadFundings()])).catch(() => undefined);
  }, [verified, loadBusinesses, loadOpportunities, loadFundings]);

  const { byContract, loading } = useMilestonesFor(opportunities);

  const ratings = useMemo(() => {
    const out: Record<string, BusinessRating> = {};
    for (const b of businesses) {
      const mine = opportunities.filter((c) => c.smeUid === b.uid);
      const live = computeRating(mine, mine.flatMap((c) => byContract[c.id] || []));
      out[b.uid] = displayRating(live, b);
    }
    return out;
  }, [businesses, opportunities, byContract]);

  const seekingUids = useMemo(() => new Set(businesses.filter((b) => b.seekingFunding).map((b) => b.uid)), [businesses]);
  // Plans I fund (accepted) or have offered on, per SME — my explicit choices only.
  const myFundingBySme = useMemo(() => {
    const out: Record<string, { funding: number; offered: number }> = {};
    for (const f of fundings) {
      if (f.status !== 'accepted' && f.status !== 'offered') continue;
      const e = (out[f.smeUid] ||= { funding: 0, offered: 0 });
      if (f.status === 'accepted') e.funding += 1;
      else e.offered += 1;
    }
    return out;
  }, [fundings]);
  const fundedUids = useMemo(() => new Set(Object.keys(myFundingBySme)), [myFundingBySme]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return businesses
      .filter((b) => tab === 0 || (tab === 1 ? seekingUids.has(b.uid) : fundedUids.has(b.uid)))
      .filter(
        (b) =>
          !needle ||
          b.businessName.toLowerCase().includes(needle) ||
          b.location.toLowerCase().includes(needle) ||
          (b.industry ? INDUSTRY_LABELS[b.industry].toLowerCase().includes(needle) : false),
      )
      .sort((a, b) => {
        const fa = fundedUids.has(a.uid) ? 1 : 0;
        const fb = fundedUids.has(b.uid) ? 1 : 0;
        if (fa !== fb) return fb - fa;
        const sa = seekingUids.has(a.uid) ? 1 : 0;
        const sb = seekingUids.has(b.uid) ? 1 : 0;
        if (sa !== sb) return sb - sa;
        const ra = ratings[a.uid]?.score ?? 0;
        const rb = ratings[b.uid]?.score ?? 0;
        if (ra !== rb) return rb - ra;
        return a.businessName.localeCompare(b.businessName);
      });
  }, [businesses, tab, q, seekingUids, fundedUids, ratings]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await loadBusinesses();
      await Promise.all([loadOpportunities(), loadFundings()]);
    } finally {
      setRefreshing(false);
    }
  };

  const unverified = !profile || profile.verificationStatus === 'unverified';

  if (unverified) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Funder" title={`Welcome, ${profile?.businessName || 'there'}`} />
        <Tile accent className="gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-[1.0625rem] font-bold">Verify your institution to see SMEs and payment plans</p>
              <p className="mt-1 text-[0.875rem] opacity-90">
                SMEs share live agreement data with funders, so PLEXUS requires every funder to submit verification first. It
                takes about a minute; the server enforces this — not just this screen.
              </p>
            </div>
          </div>
          <Button variant="solid" onClick={() => navigate('/verification')}>
            Start verification <ArrowRight className="h-4 w-4" />
          </Button>
        </Tile>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Funder"
        title="SMEs on PLEXUS"
        actions={
          <Button variant="soft" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={'h-4 w-4 ' + (refreshing ? 'animate-spin' : '')} /> Refresh
          </Button>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SegmentTabs
          tabs={['All SMEs', `Looking for funding (${seekingUids.size})`, `Funding (${fundedUids.size})`]}
          value={tab}
          onChange={setTab}
          className="[&>button]:whitespace-nowrap"
        />
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, industry or location…" className={fieldCls + ' pl-10'} />
        </label>
      </div>

      <div className="flex items-center justify-between">
        <Label>{list.length} business{list.length === 1 ? '' : 'es'}</Label>
        {loading && <span className="text-[0.75rem] text-faint">Computing ratings…</span>}
      </div>

      {list.length === 0 ? (
        <Tile className="items-center gap-2 py-12 text-center">
          <Users className="h-8 w-8 text-faint" />
          <p className="text-[0.9375rem] font-semibold text-ink">
            {tab === 1 ? 'No SMEs are looking for funding right now' : tab === 2 ? 'You are not funding any plans yet' : 'No businesses match'}
          </p>
          <p className="text-[0.8125rem] text-muted">
            {tab === 1
              ? 'Check back soon — businesses switch this on from their Dashboard.'
              : tab === 2
                ? 'Open a business that is looking for funding and choose the payment plans you want to back.'
                : 'Try a different search.'}
          </p>
        </Tile>
      ) : (
        <div className="space-y-2.5">
          {list.map((b) => (
            <SmeCard
              key={b.uid}
              b={b}
              rating={ratings[b.uid]}
              seeking={seekingUids.has(b.uid)}
              plans={opportunities.filter((c) => c.smeUid === b.uid && (c.status === 'proposed' || c.status === 'active')).length}
              mine={myFundingBySme[b.uid]}
              onOpen={() => navigate(`/funder/sme/${b.uid}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SmeCard: React.FC<{
  b: PublicProfile;
  rating: BusinessRating | undefined;
  seeking: boolean;
  plans: number;
  mine: { funding: number; offered: number } | undefined;
  onOpen: () => void;
}> = ({ b, rating, seeking, plans, mine, onOpen }) => {
  return (
    <Tile interactive as="button" onClick={onOpen} className="w-full flex-row items-stretch gap-4 text-left">
      <SquareMedia src={b.logoDataUrl} name={b.businessName} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="truncate text-[1.0625rem] font-bold text-ink">{b.businessName}</p>
          {b.verificationStatus === 'verified' && (
            <BadgeCheck className="h-[18px] w-[18px] shrink-0 text-white" fill="#1d9bf0" strokeWidth={2.5} aria-label="Verified business">
              <title>Verified business</title>
            </BadgeCheck>
          )}
          {seeking && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-accent-contrast">
              <Landmark className="h-3 w-3" /> Looking for funding{plans ? ` · ${plans} live plan${plans === 1 ? '' : 's'}` : ''}
            </span>
          )}
          {mine && (mine.funding > 0 || mine.offered > 0) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-positive/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-positive">
              <Check className="h-3 w-3" />
              {mine.funding > 0 ? `Funding ${mine.funding} plan${mine.funding === 1 ? '' : 's'}` : ''}
              {mine.funding > 0 && mine.offered > 0 ? ' · ' : ''}
              {mine.offered > 0 ? `${mine.offered} offer${mine.offered === 1 ? '' : 's'} pending` : ''}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-muted">
          <span className="font-medium text-ink/80">{b.industry ? INDUSTRY_LABELS[b.industry] : 'Industry not specified'}</span>
          {b.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> {b.location}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Since {fmtDate(b.createdAt)}
          </span>
        </div>

        {rating && <RatingStars rating={rating} className="mt-1.5" />}

        {b.description && <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-muted">{b.description}</p>}
      </div>

      <ArrowRight className="hidden h-4 w-4 shrink-0 self-center text-faint sm:block" />
    </Tile>
  );
};

export default FunderDashboard;
