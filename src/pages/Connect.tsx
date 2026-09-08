import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Mail, Users, CalendarDays, BadgeCheck } from 'lucide-react';
import { PageHeader, Tile, Label } from '../components/ui';
import { RatingStars } from '../components/common';import { useAppStore } from '../stores/appStore';
import { ratingFromProfile } from '../lib/rating';
import { fmtDate } from '../lib/format';
import { INDUSTRY_LABELS, type Industry, type PublicProfile } from '../types';

const fieldCls =
  'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none';

/**
 * Connect — every verified-or-pending business on PLEXUS, so an SME can find
 * suppliers, buyers and collaborators. Only public profile fields are shown;
 * the Firestore rules never expose identity or bank data through profiles.
 */
const Connect: React.FC = () => {
  const me = useAppStore((s) => s.user);
  const businesses = useAppStore((s) => s.businesses);
  const loadBusinesses = useAppStore((s) => s.loadBusinesses);
  const showToast = useAppStore((s) => s.showToast);

  const [q, setQ] = useState('');
  const [industry, setIndustry] = useState<Industry | ''>('');
  const [loading, setLoading] = useState(businesses.length === 0);

  useEffect(() => {
    loadBusinesses().finally(() => setLoading(false));
  }, [loadBusinesses]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return businesses
      .filter((b) => b.uid !== me?.uid)
      .filter((b) => !industry || b.industry === industry)
      .filter(
        (b) =>
          !needle ||
          b.businessName.toLowerCase().includes(needle) ||
          b.description.toLowerCase().includes(needle) ||
          b.location.toLowerCase().includes(needle),
      )
      .sort((a, b) => {
        const rank = (p: PublicProfile) => (p.verificationStatus === 'verified' ? 0 : p.verificationStatus === 'pending' ? 1 : 2);
        return rank(a) - rank(b) || a.businessName.localeCompare(b.businessName);
      });
  }, [businesses, me?.uid, q, industry]);

  const copyEmail = (email: string) => {
    navigator.clipboard?.writeText(email).then(() => showToast('Email copied.', 'success')).catch(() => undefined);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="Connect" title="Businesses on PLEXUS" />

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, location or what they do…" className={fieldCls + ' pl-10'} />
        </label>
        <select value={industry} onChange={(e) => setIndustry(e.target.value as Industry | '')} className={fieldCls + ' sm:w-56'}>
          <option value="">All industries</option>
          {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
            <option key={k} value={k}>
              {INDUSTRY_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <Label>{list.length} business{list.length === 1 ? '' : 'es'}</Label>
      </div>

      {loading && businesses.length === 0 ? (
        <Tile className="py-10 text-center text-sm text-muted">Loading…</Tile>
      ) : list.length === 0 ? (
        <Tile className="items-center gap-2 py-12 text-center">
          <Users className="h-8 w-8 text-faint" />
          <p className="text-[0.9375rem] font-semibold text-ink">No businesses match</p>
          <p className="text-[0.8125rem] text-muted">Try a different search or industry.</p>
        </Tile>
      ) : (
        <div className="space-y-2.5">
          {list.map((b) => {
            const rating = ratingFromProfile(b);
            const initials = b.businessName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
            return (
              <Tile key={b.uid} className="flex-row items-stretch gap-4">
                <div className="relative w-24 shrink-0 self-stretch overflow-hidden rounded-2xl bg-surface-inset sm:w-32">
                  {b.logoDataUrl ? (
                    <img src={b.logoDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-ink text-[1.5rem] font-bold text-canvas">{initials || 'P'}</div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-[1.0625rem] font-bold text-ink">{b.businessName}</p>
                    {b.verificationStatus === 'verified' && (
                      <BadgeCheck
                        className="h-[18px] w-[18px] shrink-0 text-white"
                        fill="#1d9bf0"
                        strokeWidth={2.5}
                        aria-label="Verified business"
                      >
                        <title>Verified business</title>
                      </BadgeCheck>
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

                  {rating ? (
                    <RatingStars rating={rating} className="mt-1.5" />
                  ) : (
                    <p className="mt-1.5 text-[0.75rem] text-faint">Not yet rated</p>
                  )}

                  {b.description && <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-muted">{b.description}</p>}

                  {b.publicEmail && (
                    <button
                      onClick={() => copyEmail(b.publicEmail)}
                      className="mt-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-accent hover:opacity-80"
                    >
                      <Mail className="h-3.5 w-3.5" /> {b.publicEmail}
                    </button>
                  )}
                </div>
              </Tile>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Connect;
