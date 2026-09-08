import React, { useEffect, useMemo, useState } from 'react';
import { Search, MapPin, Mail, Users } from 'lucide-react';
import { PageHeader, Tile, Label } from '../components/ui';
import { BusinessAvatar, VerificationBadge } from '../components/common';
import { useAppStore } from '../stores/appStore';
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <Tile key={b.uid} className="gap-3">
              <div className="flex items-start gap-3">
                <BusinessAvatar name={b.businessName} logoDataUrl={b.logoDataUrl} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-bold text-ink">{b.businessName}</p>
                  <p className="truncate text-[0.75rem] text-muted">{b.industry ? INDUSTRY_LABELS[b.industry] : 'Industry not specified'}</p>
                </div>
              </div>
              <VerificationBadge status={b.verificationStatus} />
              {b.description && <p className="line-clamp-3 text-[0.8125rem] leading-snug text-muted">{b.description}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.75rem] text-muted">
                {b.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {b.location}
                  </span>
                )}
                {b.publicEmail && (
                  <button onClick={() => copyEmail(b.publicEmail)} className="inline-flex items-center gap-1 font-medium text-accent hover:opacity-80">
                    <Mail className="h-3.5 w-3.5" /> {b.publicEmail}
                  </button>
                )}
              </div>
            </Tile>
          ))}
        </div>
      )}
    </div>
  );
};

export default Connect;
