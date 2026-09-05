import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Plus, Trash2, Loader2, Send, Save, Lock, ShieldAlert } from 'lucide-react';
import { PageHeader, Tile, Button, Label, SegmentTabs } from '../components/ui';
import { PayShapLogo } from '../components/common';
import { useAppStore } from '../stores/appStore';
import {
  createContract,
  updateDraft,
  proposeContract,
  fetchContract,
  fetchMilestones,
  validateContractInput,
  allocateAmounts,
  type ContractInput,
  type MilestoneInput,
} from '../services/contracts';
import type { Contract, Milestone, PaymentMethod } from '../types';
import { zar, cents, todayIso } from '../lib/format';

// The document is explicit: percentages are configurable, not a fixed 30/30/30/10.
const TEMPLATES: { name: string; stages: MilestoneInput[] }[] = [
  {
    name: '30 / 30 / 30 / 10',
    stages: [
      { title: 'Commitment', percent: 30, dueCondition: 'Buyer accepts the order / project', acceptanceRule: 'Agreement accepted in PLEXUS' },
      { title: 'Progress', percent: 30, dueCondition: 'Agreed mid-point milestone completed', acceptanceRule: 'Signed job card or progress photos' },
      { title: 'Delivery', percent: 30, dueCondition: 'Goods / service delivered', acceptanceRule: 'Delivery note acknowledged by buyer' },
      { title: 'Close-out', percent: 10, dueCondition: 'Final acceptance, defects resolved', acceptanceRule: 'Buyer confirms final acceptance' },
    ],
  },
  {
    name: '50 / 50',
    stages: [
      { title: 'Deposit', percent: 50, dueCondition: 'Order confirmed', acceptanceRule: 'Agreement accepted in PLEXUS' },
      { title: 'Delivery', percent: 50, dueCondition: 'Goods / service delivered', acceptanceRule: 'Delivery note acknowledged by buyer' },
    ],
  },
  {
    name: '40 / 40 / 20',
    stages: [
      { title: 'Mobilisation', percent: 40, dueCondition: 'Work begins on site', acceptanceRule: 'Site attendance / start confirmation' },
      { title: 'Halfway', percent: 40, dueCondition: 'Half of the scope complete', acceptanceRule: 'Progress photos + buyer walkthrough' },
      { title: 'Completion', percent: 20, dueCondition: 'Scope complete and accepted', acceptanceRule: 'Buyer sign-off' },
    ],
  },
];

const DEFAULT_DISPUTE_RULES =
  'If a stage is disputed, both parties will first try to resolve it in writing within 5 business days. ' +
  'Payment for the disputed stage is paused until resolved; stages already paid are not reversed. ' +
  'Unresolved disputes may be referred to mediation.';

const emptyInput = (): ContractInput => ({
  title: '',
  scope: '',
  buyerEmail: '',
  buyerName: '',
  totalValue: 0,
  expectedDelivery: '',
  paymentInstructions: { method: 'eft', accountHolder: '', bankName: '', accountNumber: '', branchCode: '', payshapId: '' },
  disputeRules: DEFAULT_DISPUTE_RULES,
  milestones: TEMPLATES[0].stages.map((s) => ({ ...s })),
});

const NewContract: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const profile = useAppStore((s) => s.profile);
  const showToast = useAppStore((s) => s.showToast);
  const loadContracts = useAppStore((s) => s.loadContracts);

  const [step, setStep] = useState(0);
  const [input, setInput] = useState<ContractInput>(emptyInput);
  const [existing, setExisting] = useState<{ contract: Contract; milestones: Milestone[] } | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [busy, setBusy] = useState<'save' | 'send' | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canAuthor = profile && profile.verificationStatus !== 'unverified';

  // Edit mode — hydrate from an existing draft.
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [c, ms] = await Promise.all([fetchContract(id), fetchMilestones(id)]);
        if (!c || c.myRole !== 'sme' || c.status !== 'draft') {
          showToast('Only your own drafts can be edited.', 'warning');
          navigate(`/contracts/${id}`);
          return;
        }
        setExisting({ contract: c, milestones: ms });
        setInput({
          title: c.title,
          scope: c.scope,
          buyerEmail: c.buyerEmail,
          buyerName: c.buyerName,
          totalValue: c.totalValue,
          expectedDelivery: c.expectedDelivery,
          paymentInstructions: { bankName: '', accountNumber: '', branchCode: '', payshapId: '', ...c.paymentInstructions },
          disputeRules: c.disputeRules,
          milestones: ms.map((m) => ({ title: m.title, percent: m.percent, dueCondition: m.dueCondition, acceptanceRule: m.acceptanceRule })),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, navigate, showToast]);

  const percentSum = useMemo(() => cents(input.milestones.reduce((s, m) => s + Number(m.percent || 0), 0)), [input.milestones]);
  const amounts = useMemo(
    () => allocateAmounts(cents(Number(input.totalValue) || 0), input.milestones.map((m) => Number(m.percent || 0))),
    [input.totalValue, input.milestones],
  );

  const setField = <K extends keyof ContractInput>(k: K, v: ContractInput[K]) => setInput((i) => ({ ...i, [k]: v }));
  const setPay = (k: keyof ContractInput['paymentInstructions'], v: string) =>
    setInput((i) => ({ ...i, paymentInstructions: { ...i.paymentInstructions, [k]: v } }));
  const setStage = (idx: number, patch: Partial<MilestoneInput>) =>
    setInput((i) => ({ ...i, milestones: i.milestones.map((m, j) => (j === idx ? { ...m, ...patch } : m)) }));

  const stepErrors = (): string | null => {
    if (step === 0) {
      if (!input.title.trim()) return 'Give the agreement a title.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.buyerEmail.trim())) return 'Enter a valid buyer email — this is how they find the proposal.';
      if (!(Number(input.totalValue) > 0)) return 'Enter the full contract value.';
      if (!input.expectedDelivery) return 'Choose an expected delivery date.';
      if (!input.paymentInstructions.accountHolder.trim()) return 'Enter the account holder to be paid.';
      if (input.paymentInstructions.method === 'eft' && !input.paymentInstructions.accountNumber?.trim()) return 'Enter the account number to be paid into.';
      if (input.paymentInstructions.method === 'payshap' && !input.paymentInstructions.payshapId?.trim()) return 'Enter your PayShap ID.';
      return null;
    }
    if (step === 1) return validateContractInput({ ...input, totalValue: Number(input.totalValue) });
    return null;
  };

  const next = () => {
    const e = stepErrors();
    if (e) return setError(e);
    setError(null);
    setStep((s) => Math.min(2, s + 1));
  };

  const persist = async (send: boolean) => {
    const finalInput = { ...input, totalValue: Number(input.totalValue) };
    const e = validateContractInput(finalInput);
    if (e) return setError(e);
    if (send && !accepted) return setError('Tick the box to digitally accept these terms before sending.');
    setError(null);
    setBusy(send ? 'send' : 'save');
    try {
      let cid = id;
      if (existing) {
        await updateDraft(existing.contract, existing.milestones, finalInput);
      } else {
        cid = await createContract(finalInput, profile?.businessName || 'Supplier');
      }
      if (send && cid) {
        const fresh = await fetchContract(cid);
        if (fresh) await proposeContract(fresh);
      }
      await loadContracts();
      showToast(send ? `Proposal sent to ${finalInput.buyerEmail}.` : 'Draft saved.', 'success');
      navigate(`/contracts/${cid}`);
    } catch (err: any) {
      setError(err?.message || 'Could not save the agreement.');
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex h-[40vh] items-center justify-center text-sm text-muted">Loading draft…</div>;

  if (!canAuthor) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Agreements" title="New payment agreement" />
        <Tile className="items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">Verify your business first</p>
            <p className="mt-1 max-w-lg text-sm text-muted">
              Payment agreements are a higher-risk feature. Submit your business verification once, and every agreement
              you propose will show buyers your verification status.
            </p>
          </div>
          <Button variant="accent" onClick={() => navigate('/verification')}>
            Go to verification <ArrowRight className="h-4 w-4" />
          </Button>
        </Tile>
      </div>
    );
  }

  const total = Number(input.totalValue) || 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Agreements"
        title={existing ? 'Edit draft agreement' : 'New payment agreement'}
        subtitle="Agree the value, the stages and the proof required — before any work starts."
        actions={
          <Button variant="soft" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        }
      />

      <SegmentTabs tabs={['1 · The deal', '2 · Payment stages', '3 · Review & send']} value={step} onChange={(i) => i < step && setStep(i)} className="w-full [&>button]:flex-1" />

      {step === 0 && (
        <div className="space-y-5">
          <Tile className="gap-4">
            <Label>What is being delivered</Label>
            <Input label="Agreement title *" value={input.title} onChange={(e) => setField('title', e.target.value)} maxLength={120} placeholder="e.g. 200 branded staff uniforms" />
            <TextArea label="Scope of work" value={input.scope} onChange={(e) => setField('scope', e.target.value)} maxLength={2000} rows={3} placeholder="What exactly will be delivered, quantities, specifications…" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Full contract value (ZAR) *" type="number" min={0} step="0.01" inputMode="decimal" value={input.totalValue || ''} onChange={(e) => setField('totalValue', Number(e.target.value))} placeholder="40000" />
              <Input label="Expected delivery *" type="date" min={todayIso()} value={input.expectedDelivery} onChange={(e) => setField('expectedDelivery', e.target.value)} />
            </div>
          </Tile>

          <Tile className="gap-4">
            <Label>The buyer</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Buyer email *" type="email" value={input.buyerEmail} onChange={(e) => setField('buyerEmail', e.target.value)} maxLength={254} placeholder="procurement@buyer.co.za" />
              <Input label="Buyer business name" value={input.buyerName} onChange={(e) => setField('buyerName', e.target.value)} maxLength={120} />
            </div>
            <p className="text-[0.75rem] text-faint">
              The buyer signs in with this email to review and accept. Only they can see the proposal.
            </p>
          </Tile>

          <Tile className="gap-4">
            <Label>Where you will be paid</Label>
            <div className="flex gap-2">
              {(['eft', 'payshap'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPay('method', m)}
                  className={
                    'flex items-center gap-2 rounded-full px-4 py-2 text-[0.8125rem] font-semibold transition-colors ' +
                    (input.paymentInstructions.method === m ? 'bg-ink text-canvas' : 'bg-surface-inset text-muted hover:text-ink')
                  }
                >
                  {m === 'payshap' && <PayShapLogo className="h-4 w-4" />}
                  {m === 'eft' ? 'Bank transfer (EFT)' : 'PayShap'}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Account holder *" value={input.paymentInstructions.accountHolder} onChange={(e) => setPay('accountHolder', e.target.value)} maxLength={120} />
              {input.paymentInstructions.method === 'eft' ? (
                <>
                  <Input label="Bank" value={input.paymentInstructions.bankName || ''} onChange={(e) => setPay('bankName', e.target.value)} maxLength={64} />
                  <Input label="Account number *" value={input.paymentInstructions.accountNumber || ''} onChange={(e) => setPay('accountNumber', e.target.value)} maxLength={32} inputMode="numeric" />
                  <Input label="Branch code" value={input.paymentInstructions.branchCode || ''} onChange={(e) => setPay('branchCode', e.target.value)} maxLength={16} inputMode="numeric" />
                </>
              ) : (
                <Input label="PayShap ID (ShapID) *" value={input.paymentInstructions.payshapId || ''} onChange={(e) => setPay('payshapId', e.target.value)} maxLength={64} placeholder="082 123 4567" />
              )}
            </div>
            <p className="text-[0.75rem] text-faint">
              PLEXUS never holds funds. The buyer pays you directly using these details and the stage reference we generate.
            </p>
          </Tile>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <Tile className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Payment stages</Label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setField('milestones', t.stages.map((s) => ({ ...s })))}
                    className="rounded-full bg-surface-inset px-3 py-1.5 text-[0.75rem] font-semibold text-muted transition-colors hover:text-ink"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="-mt-2 text-[0.75rem] text-faint">Percentages are yours to set — templates are only a starting point.</p>

            <div className="space-y-3">
              {input.milestones.map((m, i) => (
                <div key={i} className="rounded-2xl bg-surface-inset/50 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.75rem] font-bold text-canvas">{i + 1}</span>
                    <input
                      value={m.title}
                      onChange={(e) => setStage(i, { title: e.target.value })}
                      placeholder="Stage title"
                      maxLength={120}
                      className="min-w-0 flex-1 rounded-xl bg-surface px-3 py-2 text-[0.875rem] font-semibold text-ink placeholder:text-faint focus:outline-none"
                    />
                    <div className="flex items-center gap-1 rounded-xl bg-surface px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={m.percent}
                        onChange={(e) => setStage(i, { percent: Number(e.target.value) })}
                        aria-label="Percent"
                        className="w-14 bg-transparent text-right text-[0.875rem] font-semibold text-ink focus:outline-none"
                      />
                      <span className="text-[0.8125rem] text-muted">%</span>
                    </div>
                    <span className="tnum w-28 shrink-0 text-right text-[0.875rem] font-semibold text-ink">{zar(amounts[i] || 0)}</span>
                    <button
                      type="button"
                      onClick={() => setField('milestones', input.milestones.filter((_, j) => j !== i))}
                      disabled={input.milestones.length <= 1}
                      aria-label="Remove stage"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-surface hover:text-negative disabled:opacity-30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    <input
                      value={m.dueCondition}
                      onChange={(e) => setStage(i, { dueCondition: e.target.value })}
                      placeholder="Due when… (condition)"
                      maxLength={300}
                      className="rounded-xl bg-surface px-3 py-2 text-[0.8125rem] text-ink placeholder:text-faint focus:outline-none"
                    />
                    <input
                      value={m.acceptanceRule}
                      onChange={(e) => setStage(i, { acceptanceRule: e.target.value })}
                      placeholder="Proof the buyer will accept"
                      maxLength={300}
                      className="rounded-xl bg-surface px-3 py-2 text-[0.8125rem] text-ink placeholder:text-faint focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
              <button
                type="button"
                onClick={() => setField('milestones', [...input.milestones, { title: '', percent: 0, dueCondition: '', acceptanceRule: '' }])}
                disabled={input.milestones.length >= 12}
                className="inline-flex items-center gap-1.5 text-[0.8125rem] font-semibold text-accent hover:opacity-80 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> Add stage
              </button>
              <p className={'tnum text-[0.875rem] font-semibold ' + (Math.abs(percentSum - 100) < 0.01 ? 'text-positive' : 'text-negative')}>
                {percentSum}% of {zar(total)} {Math.abs(percentSum - 100) < 0.01 ? '✓' : '— must equal 100%'}
              </p>
            </div>
          </Tile>

          <Tile className="gap-3">
            <Label>Dispute rules</Label>
            <TextArea label="" value={input.disputeRules} onChange={(e) => setField('disputeRules', e.target.value)} maxLength={2000} rows={3} />
            <p className="text-[0.75rem] text-faint">Both parties accept these rules up front. They apply if a stage is disputed.</p>
          </Tile>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Tile className="gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Label>Summary</Label>
                <p className="mt-1 text-[1.25rem] font-bold text-ink">{input.title}</p>
                <p className="text-[0.8125rem] text-muted">
                  {profile?.businessName} → {input.buyerName || input.buyerEmail} · delivery by {input.expectedDelivery}
                </p>
              </div>
              <p className="tnum text-[1.75rem] font-bold text-ink">{zar(total)}</p>
            </div>
            {input.scope && <p className="text-[0.875rem] leading-relaxed text-muted">{input.scope}</p>}
            <div className="divide-y divide-hairline rounded-2xl bg-surface-inset/50">
              {input.milestones.map((m, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.75rem] font-bold text-canvas">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.875rem] font-semibold text-ink">{m.title}</p>
                    <p className="truncate text-[0.75rem] text-muted">{m.dueCondition || '—'} · proof: {m.acceptanceRule || '—'}</p>
                  </div>
                  <span className="text-[0.8125rem] text-muted">{m.percent}%</span>
                  <span className="tnum w-28 text-right text-[0.875rem] font-semibold text-ink">{zar(amounts[i] || 0)}</span>
                </div>
              ))}
            </div>
            <p className="text-[0.75rem] text-faint">
              Paid via {input.paymentInstructions.method === 'payshap' ? `PayShap · ${input.paymentInstructions.payshapId}` : `EFT · ${input.paymentInstructions.bankName || 'bank'} ${input.paymentInstructions.accountNumber}`} · {input.paymentInstructions.accountHolder}
            </p>
          </Tile>

          <Tile className="gap-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--accent)]" />
              <span className="text-[0.875rem] leading-relaxed text-ink">
                I, acting for <strong>{profile?.businessName}</strong>, accept the total value, stages, percentages, acceptance rules and
                dispute rules above. I understand that once the buyer accepts, these terms are <strong>locked</strong> and any
                material change requires a new agreement.
              </span>
            </label>
            <p className="flex items-center gap-1.5 text-[0.75rem] text-faint">
              <Lock className="h-3.5 w-3.5" /> Your acceptance is timestamped by the server and recorded in the audit trail.
            </p>
          </Tile>
        </div>
      )}

      {error && <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="soft" onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))} disabled={Boolean(busy)}>
          <ArrowLeft className="h-4 w-4" /> {step === 0 ? 'Cancel' : 'Back'}
        </Button>
        <div className="flex flex-wrap gap-2">
          {step < 2 ? (
            <Button variant="solid" onClick={next}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="soft" onClick={() => persist(false)} disabled={Boolean(busy)}>
                {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save draft
              </Button>
              <Button variant="accent" onClick={() => persist(true)} disabled={Boolean(busy)}>
                {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Accept & send to buyer
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, className, ...rest }) => (
  <label className="flex flex-col gap-1.5">
    {label && <span className="text-[0.75rem] font-medium text-muted">{label}</span>}
    <input
      {...rest}
      className={'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:bg-surface-inset focus:outline-none ' + (className || '')}
    />
  </label>
);

const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, className, ...rest }) => (
  <label className="flex flex-col gap-1.5">
    {label && <span className="text-[0.75rem] font-medium text-muted">{label}</span>}
    <textarea
      {...rest}
      className={'w-full resize-y rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] leading-relaxed text-ink placeholder:text-faint focus:bg-surface-inset focus:outline-none ' + (className || '')}
    />
  </label>
);

export default NewContract;
