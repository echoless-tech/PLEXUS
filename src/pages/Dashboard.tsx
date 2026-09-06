import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, ShieldAlert, ArrowRight, Sparkles, Loader2, ScanLine, Users, BarChart3 } from 'lucide-react';
import { PageHeader, Tile, Button, Label } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { fetchMilestones, createContract } from '../services/contracts';
import type { ContractView, Milestone } from '../types';
import { ContractRow } from './Contracts';

const SECTIONS = [
  {
    to: '/run',
    icon: ScanLine,
    title: 'Run',
    text: 'Scan or upload invoices, receipts and bank statements to evidence how your business performs.',
  },
  {
    to: '/connect',
    icon: Users,
    title: 'Connect',
    text: 'Find verified businesses on PLEXUS to buy from, supply to or collaborate with.',
  },
  {
    to: '/statistics',
    icon: BarChart3,
    title: 'Statistics',
    text: 'Your rating, on-time delivery and payment performance — what funders and buyers see.',
  },
];

/**
 * Dashboard = "what needs my action" + money position. It reads live
 * milestones for the user's open agreements to compute paid / outstanding.
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const contracts = useAppStore((s) => s.contracts);
  const loading = useAppStore((s) => s.contractsLoading);
  const loadContracts = useAppStore((s) => s.loadContracts);
  const showToast = useAppStore((s) => s.showToast);

  const [milestonesByContract, setMbc] = useState<Record<string, Milestone[]>>({});
  const [seeding, setSeeding] = useState(false);

  const open = useMemo(() => contracts.filter((c) => c.status === 'active'), [contracts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        open.map(async (c) => [c.id, await fetchMilestones(c.id).catch(() => [] as Milestone[])] as const),
      );
      if (!cancelled) setMbc(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [open.map((c) => c.id + c.updatedAt.getTime()).join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsAction = useMemo(() => {
    const items: { c: ContractView; label: string }[] = [];
    for (const c of contracts) {
      if (c.awaitingMyAcceptance) items.push({ c, label: 'Review and accept the proposal' });
      else if (c.myRole === 'sme' && c.status === 'draft') items.push({ c, label: 'Finish and send this draft' });
      else if (c.status === 'active') {
        const ms = milestonesByContract[c.id] || [];
        if (c.myRole === 'buyer' && ms.some((m) => m.status === 'evidence_submitted')) items.push({ c, label: 'Evidence waiting for your approval' });
        else if (c.myRole === 'buyer' && ms.some((m) => m.status === 'approved')) items.push({ c, label: 'Approved stage — payment due' });
        else if (c.myRole === 'sme' && ms.some((m) => m.status === 'pending' && m.rejectionNote)) items.push({ c, label: 'A stage was returned — resubmit evidence' });
        else if (ms.some((m) => m.status === 'disputed')) items.push({ c, label: 'Open dispute needs resolution' });
      }
    }
    return items;
  }, [contracts, milestonesByContract]);

  const loadExample = async () => {
    setSeeding(true);
    try {
      const cid = await createContract(
        {
          title: 'Example — 200 branded staff uniforms',
          scope:
            'Supply and brand 200 staff uniforms (polo shirt + cap) for the buyer\'s retail team. Includes embroidery of the buyer logo, ' +
            'sizing run, packing per store and delivery to the Johannesburg distribution centre.',
          buyerEmail: 'buyer@example.co.za',
          buyerName: 'Example Retail (Pty) Ltd',
          totalValue: 40000,
          expectedDelivery: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          paymentInstructions: { method: 'eft', accountHolder: profile?.businessName || 'Supplier', bankName: 'FNB', accountNumber: '62000000000', branchCode: '250655' },
          seekingFunding: false,
          disputeRules:
            'If a stage is disputed, both parties will first try to resolve it in writing within 5 business days. Payment for the disputed stage is paused until resolved; stages already paid are not reversed.',
          milestones: [
            { title: 'Commitment', percent: 30, dueCondition: 'Buyer accepts the order', acceptanceRule: 'Agreement accepted in PLEXUS' },
            { title: 'Fabric & embroidery complete', percent: 30, dueCondition: 'First 100 units produced', acceptanceRule: 'Photos of finished units + signed job card' },
            { title: 'Delivery', percent: 30, dueCondition: 'All 200 units delivered to DC', acceptanceRule: 'Delivery note acknowledged by buyer' },
            { title: 'Close-out', percent: 10, dueCondition: 'Sizing swaps resolved', acceptanceRule: 'Buyer final acceptance' },
          ],
        },
        profile?.businessName || 'Supplier',
      );
      await loadContracts();
      showToast('Example agreement created as a draft — change the buyer email to a real one before sending.', 'success');
      navigate(`/contracts/${cid}`);
    } catch (e: any) {
      showToast(e?.message || 'Could not create the example.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const unverified = !profile || profile.verificationStatus === 'unverified';
  const listedForFunding = useMemo(
    () => contracts.filter((c) => c.myRole === 'sme' && c.seekingFunding && c.status !== 'cancelled' && c.status !== 'draft').length,
    [contracts],
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${profile?.businessName || 'there'}`}
        subtitle="Get paid as the work progresses — not months after it's done."
        actions={
          <Button variant="accent" onClick={() => navigate('/contracts/new')}>
            <FilePlus2 className="h-4 w-4" /> New agreement
          </Button>
        }
      />

      {unverified && (
        <Tile interactive as="button" onClick={() => navigate('/verification')} className="w-full flex-row items-center gap-4 text-left">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold text-ink">Verify your business to create or accept agreements</p>
            <p className="text-[0.8125rem] text-muted">Takes about a minute. Buyers, suppliers and funders see each other's verification status.</p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-faint" />
        </Tile>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map(({ to, icon: Icon, title, text }) => (
          <Tile key={to} interactive as="button" onClick={() => navigate(to)} className="gap-3 text-left">
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-canvas">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-faint" />
            </div>
            <div>
              <p className="text-[1rem] font-bold text-ink">{title}</p>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{text}</p>
            </div>
          </Tile>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Needs your action</Label>
          {needsAction.length > 0 && <span className="text-[0.75rem] text-muted">{needsAction.length} item{needsAction.length === 1 ? '' : 's'}</span>}
        </div>
        {loading && contracts.length === 0 ? (
          <Tile className="py-8 text-center text-sm text-muted">Loading…</Tile>
        ) : needsAction.length === 0 ? (
          <Tile className="py-8 text-center text-sm text-muted">You're all caught up.</Tile>
        ) : (
          <div className="space-y-2.5">
            {needsAction.map(({ c, label }) => (
              <div key={c.id} className="space-y-1">
                <p className="pl-1 text-[0.75rem] font-semibold text-accent">{label}</p>
                <ContractRow c={c} onOpen={() => navigate(`/contracts/${c.id}`)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {contracts.length === 0 && !loading && !unverified && (
        <Tile className="flex-row flex-wrap items-center gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[0.9375rem] font-semibold text-ink">See how it works with the R40,000 example</p>
            <p className="text-[0.8125rem] text-muted">Creates a draft in your account with four stages (R12k · R12k · R12k · R4k). You control when — or if — it is sent.</p>
          </div>
          <Button variant="soft" onClick={loadExample} disabled={seeding}>
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Load example
          </Button>
        </Tile>
      )}

      {contracts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Label>Recent agreements</Label>
              <span className="text-[0.75rem] text-muted">
                {open.length} active · {contracts.length} total{listedForFunding ? ` · ${listedForFunding} listed for funders` : ''}
              </span>
            </div>
            <button onClick={() => navigate('/contracts')} className="text-[0.8125rem] font-medium text-muted hover:text-ink">View all</button>
          </div>
          <div className="space-y-2.5">
            {contracts.slice(0, 5).map((c) => (
              <ContractRow key={c.id} c={c} onOpen={() => navigate(`/contracts/${c.id}`)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
