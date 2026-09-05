import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, ChevronRight, Inbox } from 'lucide-react';
import { PageHeader, Tile, Button, SegmentTabs } from '../components/ui';
import { ContractStatusPill } from '../components/common';
import { useAppStore } from '../stores/appStore';
import type { ContractView } from '../types';
import { zar, fmtDate } from '../lib/format';

const TABS = ['All', 'Needs my action', 'I supply', 'I pay', 'Closed'];

const Contracts: React.FC = () => {
  const navigate = useNavigate();
  const contracts = useAppStore((s) => s.contracts);
  const loading = useAppStore((s) => s.contractsLoading);
  const error = useAppStore((s) => s.contractsError);
  const [tab, setTab] = useState(0);

  const filtered = useMemo(() => {
    switch (tab) {
      case 1:
        return contracts.filter((c) => c.awaitingMyAcceptance || (c.myRole === 'sme' && c.status === 'draft'));
      case 2:
        return contracts.filter((c) => c.myRole === 'sme' && !['completed', 'cancelled'].includes(c.status));
      case 3:
        return contracts.filter((c) => c.myRole === 'buyer' && !['completed', 'cancelled'].includes(c.status));
      case 4:
        return contracts.filter((c) => ['completed', 'cancelled'].includes(c.status));
      default:
        return contracts;
    }
  }, [contracts, tab]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Agreements"
        title="Payment agreements"
        subtitle="Every agreement you supply on, pay on, or have been invited to."
        actions={
          <Button variant="accent" onClick={() => navigate('/contracts/new')}>
            <FilePlus2 className="h-4 w-4" /> New agreement
          </Button>
        }
      />

      <div className="plexus-scroll overflow-x-auto">
        <SegmentTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>

      {error && <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{error}</p>}

      {loading && contracts.length === 0 ? (
        <Tile className="py-10 text-center text-sm text-muted">Loading agreements…</Tile>
      ) : filtered.length === 0 ? (
        <Tile className="items-center gap-3 py-14 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Inbox className="h-6 w-6" />
          </div>
          <p className="text-[1rem] font-semibold text-ink">Nothing here yet</p>
          <p className="max-w-sm text-sm text-muted">
            {tab === 0
              ? 'Create your first payment agreement. Buyers you invite will see it the moment they sign in with the email you enter.'
              : 'No agreements match this filter.'}
          </p>
          {tab === 0 && (
            <Button variant="accent" onClick={() => navigate('/contracts/new')}>
              <FilePlus2 className="h-4 w-4" /> New agreement
            </Button>
          )}
        </Tile>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((c) => (
            <ContractRow key={c.id} c={c} onOpen={() => navigate(`/contracts/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
};

export const ContractRow: React.FC<{ c: ContractView; onOpen: () => void }> = ({ c, onOpen }) => (
  <Tile interactive as="button" onClick={onOpen} className="w-full flex-row items-center gap-3 !py-4 text-left">
    <div className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider ' + (c.myRole === 'sme' ? 'bg-ink text-canvas' : 'bg-accent-soft text-accent')}>
      {c.myRole === 'sme' ? 'Sup' : 'Buy'}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.title}</p>
        {c.awaitingMyAcceptance ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-accent-contrast">Accept?</span>
        ) : (
          <ContractStatusPill status={c.status} />
        )}
      </div>
      <p className="truncate text-[0.8125rem] text-muted">
        {c.myRole === 'sme' ? `Buyer: ${c.buyerName || c.buyerEmail}` : `Supplier: ${c.smeName}`} · {c.milestoneCount} stages · delivery {fmtDate(c.expectedDelivery)}
      </p>
    </div>
    <span className="tnum shrink-0 text-[1rem] font-bold text-ink">{zar(c.totalValue, false)}</span>
    <ChevronRight className="hidden h-4 w-4 shrink-0 text-faint sm:block" />
  </Tile>
);

export default Contracts;
