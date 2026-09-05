import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Lock, Send, Undo2, Ban, CheckCircle2, Upload, XCircle, AlertTriangle,
  Copy, Loader2, Pencil, ShieldCheck, FileText, Clock, Banknote, Scale,
} from 'lucide-react';
import { Tile, Button, GhostButton, Label } from '../components/ui';
import { ContractStatusPill, MilestoneStatusPill, VerificationBadge, PayShapLogo } from '../components/common';
import { useAppStore } from '../stores/appStore';
import * as svc from '../services/contracts';
import { fetchProfile } from '../services/profile';
import type { ContractView, ContractEvent, EvidenceType, Milestone, PublicProfile, Role } from '../types';
import { LIMITS } from '../types';
import { zar, fmtDate, fmtDateTime, paymentReferenceFor } from '../lib/format';

const EVIDENCE_TYPES: { value: EvidenceType; label: string }[] = [
  { value: 'buyer_acknowledgement', label: 'Buyer acknowledgement' },
  { value: 'delivery_confirmation', label: 'Delivery confirmation' },
  { value: 'job_card', label: 'Signed job card' },
  { value: 'photo', label: 'Photo of completed work' },
  { value: 'document', label: 'Document / certificate' },
  { value: 'other', label: 'Other' },
];

type ModalKind =
  | { kind: 'evidence'; m: Milestone }
  | { kind: 'reject'; m: Milestone }
  | { kind: 'pay'; m: Milestone }
  | { kind: 'dispute'; m: Milestone }
  | { kind: 'resolve'; m: Milestone }
  | { kind: 'cancel' }
  | { kind: 'decline' }
  | { kind: 'accept' }
  | null;

const ContractDetail: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const showToast = useAppStore((s) => s.showToast);
  const loadContracts = useAppStore((s) => s.loadContracts);

  const [contract, setContract] = useState<ContractView | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [counterparty, setCounterparty] = useState<PublicProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = svc.subscribeContract(
      id,
      (c, ms, ev) => {
        setContract(c);
        setMilestones(ms);
        setEvents(ev);
        setReady(true);
      },
      (e) => {
        setLoadError(e.message.includes('permission') ? 'You are not a party to this agreement.' : e.message);
        setReady(true);
      },
    );
    return unsub;
  }, [id]);

  // Counterparty's public profile (name + verification status only).
  useEffect(() => {
    if (!contract) return;
    const other = contract.myRole === 'sme' ? contract.buyerUid : contract.smeUid;
    if (!other) {
      setCounterparty(null);
      return;
    }
    fetchProfile(other).then(setCounterparty).catch(() => setCounterparty(null));
  }, [contract?.smeUid, contract?.buyerUid, contract?.myRole]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto close-out: when every stage is paid, either party's client completes the agreement.
  useEffect(() => {
    if (!contract || contract.status !== 'active' || !milestones.length) return;
    if (milestones.every((m) => m.status === 'paid')) {
      svc.completeContract(contract).then(loadContracts).catch(() => undefined);
    }
  }, [contract, milestones, loadContracts]);

  const summary = useMemo(() => svc.summarise(milestones), [milestones]);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      showToast(label, 'success');
      setModal(null);
      loadContracts();
    } catch (e: any) {
      showToast(e?.code === 'permission-denied' ? 'That action is not allowed for your role or at this stage.' : e?.message || 'Action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return <div className="flex h-[40vh] items-center justify-center text-sm text-muted">Loading agreement…</div>;

  if (loadError || !contract) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10">
        <Tile className="items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-muted" />
          <p className="text-lg font-semibold text-ink">{loadError || 'Agreement not found'}</p>
          <Button variant="soft" onClick={() => navigate('/contracts')}>
            <ArrowLeft className="h-4 w-4" /> Back to agreements
          </Button>
        </Tile>
      </div>
    );
  }

  const c = contract;
  const role: Role = c.myRole;
  const isSme = role === 'sme';
  const isBuyer = role === 'buyer';
  const otherName = isSme ? c.buyerName || c.buyerEmail : c.smeName;
  const progress = c.totalValue ? Math.min(100, Math.round((summary.paid / c.totalValue) * 100)) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 py-6">
        <div className="min-w-0">
          <button onClick={() => navigate('/contracts')} className="mb-2 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-muted hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Agreements
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[1.5rem] font-bold tracking-[-0.02em] text-ink sm:text-[1.875rem]">{c.title}</h1>
            <ContractStatusPill status={c.status} />
          </div>
          <p className="mt-1.5 text-[0.875rem] text-muted">
            {isSme ? 'You supply' : `${c.smeName} supplies`} · {isBuyer ? 'you pay' : `${otherName} pays`} · delivery by {fmtDate(c.expectedDelivery)}
          </p>
        </div>
        <div className="text-right">
          <p className="tnum text-[1.75rem] font-bold text-ink">{zar(c.totalValue)}</p>
          <p className="text-[0.75rem] text-muted">{c.milestoneCount} payment stages</p>
        </div>
      </div>

      {/* ── Buyer acceptance panel ─────────────────────────────────── */}
      {c.awaitingMyAcceptance && (
        <Tile accent className="gap-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-[1.0625rem] font-bold">{c.smeName} has proposed this payment agreement to you</p>
              <p className="mt-1 text-[0.875rem] opacity-90">
                Review the value, stages and proof required below. Accepting locks these terms for both of you and starts the
                first stage. Nothing is paid until you approve each stage.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {profile?.verificationStatus === 'unverified' ? (
              <Button variant="solid" onClick={() => navigate('/verification')}>
                <ShieldCheck className="h-4 w-4" /> Verify your business to accept
              </Button>
            ) : (
              <Button variant="solid" onClick={() => setModal({ kind: 'accept' })}>
                <CheckCircle2 className="h-4 w-4" /> Accept agreement
              </Button>
            )}
            <Button variant="soft" onClick={() => setModal({ kind: 'decline' })}>
              <XCircle className="h-4 w-4" /> Decline
            </Button>
          </div>
        </Tile>
      )}

      {/* ── Parties + money strip ──────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Tile className="gap-2">
          <Label>Supplier (gets paid)</Label>
          <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.smeName}</p>
          {isSme ? <VerificationBadge status={profile?.verificationStatus || 'unverified'} /> : counterparty && <VerificationBadge status={counterparty.verificationStatus} />}
        </Tile>
        <Tile className="gap-2">
          <Label>Buyer (pays)</Label>
          <p className="truncate text-[0.9375rem] font-semibold text-ink">{c.buyerName || c.buyerEmail}</p>
          {c.buyerUid ? (
            isBuyer ? <VerificationBadge status={profile?.verificationStatus || 'unverified'} /> : counterparty && <VerificationBadge status={counterparty.verificationStatus} />
          ) : (
            <span className="text-[0.75rem] text-faint">Invited · {c.buyerEmail}</span>
          )}
        </Tile>
        <Tile className="gap-2">
          <Label>Paid so far</Label>
          <p className="tnum text-[1.25rem] font-bold text-ink">
            {zar(summary.paid)} <span className="text-[0.8125rem] font-medium text-muted">/ {zar(c.totalValue)}</span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-inset">
            <div className="h-full rounded-full bg-positive transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          {summary.awaitingPayment > 0 && <p className="text-[0.75rem] text-accent">{zar(summary.awaitingPayment)} approved, awaiting payment</p>}
        </Tile>
      </div>

      {/* ── Lock notice / SME draft actions ────────────────────────── */}
      {c.status === 'active' && (
        <p className="flex items-center gap-2 text-[0.8125rem] text-muted">
          <Lock className="h-4 w-4 text-positive" /> Terms locked on {fmtDateTime(c.lockedAt)} — value, stages and parties can no longer change.
        </p>
      )}
      {isSme && c.status === 'draft' && (
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => navigate(`/contracts/${c.id}/edit`)}>
            <Pencil className="h-4 w-4" /> Edit draft
          </Button>
          <Button variant="accent" onClick={() => navigate(`/contracts/${c.id}/edit`)}>
            <Send className="h-4 w-4" /> Review & send to buyer
          </Button>
          <Button variant="soft" onClick={() => setModal({ kind: 'cancel' })}>
            <Ban className="h-4 w-4" /> Cancel
          </Button>
        </div>
      )}
      {isSme && c.status === 'proposed' && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 flex items-center gap-1.5 text-[0.8125rem] text-muted">
            <Clock className="h-4 w-4" /> Sent {fmtDateTime(c.smeAcceptedAt)} · waiting for {c.buyerEmail}
          </p>
          <Button variant="soft" onClick={() => run('Proposal withdrawn to draft.', () => svc.withdrawProposal(c))} disabled={busy}>
            <Undo2 className="h-4 w-4" /> Withdraw to draft
          </Button>
          <Button variant="soft" onClick={() => setModal({ kind: 'cancel' })}>
            <Ban className="h-4 w-4" /> Cancel
          </Button>
        </div>
      )}
      {c.status === 'cancelled' && (
        <Tile className="gap-1 bg-negative/5">
          <p className="text-[0.875rem] font-semibold text-negative">Cancelled</p>
          <p className="text-[0.8125rem] text-muted">{c.cancelReason}</p>
        </Tile>
      )}

      {/* ── Scope + payment details ────────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Tile className="gap-2">
          <Label>Scope</Label>
          <p className="whitespace-pre-wrap text-[0.875rem] leading-relaxed text-muted">{c.scope || 'No scope description.'}</p>
        </Tile>
        <Tile className="gap-2">
          <Label>Payment details</Label>
          <p className="flex items-center gap-2 text-[0.875rem] text-ink">
            {c.paymentInstructions.method === 'payshap' ? <PayShapLogo className="h-4 w-4" /> : <Banknote className="h-4 w-4 text-muted" />}
            {c.paymentInstructions.method === 'payshap'
              ? `PayShap · ${c.paymentInstructions.payshapId}`
              : `${c.paymentInstructions.bankName || 'Bank'} · ${c.paymentInstructions.accountNumber}${c.paymentInstructions.branchCode ? ` · ${c.paymentInstructions.branchCode}` : ''}`}
          </p>
          <p className="text-[0.8125rem] text-muted">Account holder: {c.paymentInstructions.accountHolder}</p>
          <p className="mt-1 text-[0.75rem] text-faint">PLEXUS never holds funds — each stage is paid directly with the reference shown on it.</p>
        </Tile>
      </div>

      {/* ── Milestones ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label>Payment stages</Label>
        {milestones.map((m, i) => (
          <MilestoneCard
            key={m.id}
            m={m}
            index={i}
            contract={c}
            role={role}
            busy={busy}
            firstOpen={milestones.findIndex((x) => x.status !== 'paid') === i}
            onAction={(k) => setModal({ kind: k, m } as ModalKind)}
            onApprove={() => run(`"${m.title}" approved — payment request issued.`, () => svc.approveMilestone(c.id, m))}
            onWithdraw={() => run('Evidence withdrawn.', () => svc.withdrawEvidence(c.id, m))}
          />
        ))}
      </div>

      {/* ── Dispute rules ──────────────────────────────────────────── */}
      <Tile className="gap-2">
        <Label>Agreed dispute rules</Label>
        <p className="whitespace-pre-wrap text-[0.8125rem] leading-relaxed text-muted">{c.disputeRules || '—'}</p>
      </Tile>

      {/* ── Audit trail ────────────────────────────────────────────── */}
      <Tile className="gap-3">
        <div className="flex items-center justify-between">
          <Label>Audit trail</Label>
          <span className="text-[0.75rem] text-faint">{events.length} events · server-timestamped · append-only</span>
        </div>
        <ol className="divide-y divide-hairline">
          {events.map((e) => (
            <li key={e.id} className="flex gap-3 py-2.5">
              <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (e.actorRole === 'sme' ? 'bg-ink/60' : 'bg-accent')} />
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] text-ink">{e.summary}</p>
                <p className="text-[0.6875rem] text-faint">
                  {e.actorRole === 'sme' ? c.smeName : c.buyerName || 'Buyer'} · {fmtDateTime(e.at)}
                </p>
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="py-3 text-[0.8125rem] text-muted">No events yet.</li>}
        </ol>
      </Tile>

      {/* ── Active-phase cancel ────────────────────────────────────── */}
      {c.status === 'active' && (
        <div className="flex justify-end">
          <button onClick={() => setModal({ kind: 'cancel' })} className="text-[0.75rem] text-faint hover:text-negative">
            Cancel this agreement…
          </button>
        </div>
      )}

      {modal && (
        <ActionModal
          modal={modal}
          contract={c}
          role={role}
          busy={busy}
          onClose={() => setModal(null)}
          run={run}
        />
      )}
    </div>
  );
};

// ─── Milestone card ──────────────────────────────────────────────────

const MilestoneCard: React.FC<{
  m: Milestone;
  index: number;
  contract: ContractView;
  role: Role;
  busy: boolean;
  firstOpen: boolean;
  onAction: (k: 'evidence' | 'reject' | 'pay' | 'dispute' | 'resolve') => void;
  onApprove: () => void;
  onWithdraw: () => void;
}> = ({ m, index, contract: c, role, busy, firstOpen, onAction, onApprove, onWithdraw }) => {
  const active = c.status === 'active';
  const isSme = role === 'sme';
  const isBuyer = role === 'buyer';
  const ref = paymentReferenceFor(c.id, m.order);
  const showToast = useAppStore((s) => s.showToast);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => showToast('Copied.', 'success')).catch(() => undefined);
  };

  return (
    <Tile className={'gap-3 ' + (m.status === 'approved' ? 'ring-1 ring-accent/40' : '')}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ' + (m.status === 'paid' ? 'bg-positive text-canvas' : 'bg-ink text-canvas')}>
          {m.status === 'paid' ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-ink">{m.title}</p>
          <p className="truncate text-[0.75rem] text-muted">
            {m.percent}% · due when: {m.dueCondition || '—'}
          </p>
        </div>
        <span className="tnum text-[1rem] font-bold text-ink">{zar(m.amount)}</span>
        <MilestoneStatusPill status={m.status} />
      </div>

      <p className="text-[0.75rem] text-faint">Proof required: {m.acceptanceRule || 'Buyer acknowledgement'}</p>

      {/* Evidence on record */}
      {m.evidence && (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-surface-inset/50 p-3">
          {m.evidence.dataUrl && m.evidence.dataUrl.startsWith('data:image') ? (
            <img src={m.evidence.dataUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-surface text-muted">
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[0.8125rem] font-semibold text-ink">{EVIDENCE_TYPES.find((t) => t.value === m.evidence!.type)?.label}</p>
            {m.evidence.note && <p className="whitespace-pre-wrap text-[0.8125rem] text-muted">{m.evidence.note}</p>}
            <p className="text-[0.6875rem] text-faint">
              {m.evidence.fileName ? `${m.evidence.fileName} · ` : ''}submitted {fmtDateTime(m.evidence.submittedAt)}
            </p>
          </div>
          {m.evidence.dataUrl && (
            <a href={m.evidence.dataUrl} download={m.evidence.fileName || 'evidence'} className="text-[0.75rem] font-semibold text-accent hover:opacity-80">
              Download
            </a>
          )}
        </div>
      )}

      {m.rejectionNote && m.status === 'pending' && (
        <p className="flex items-start gap-2 rounded-2xl bg-negative/10 px-3 py-2 text-[0.8125rem] text-negative">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> Returned by buyer: {m.rejectionNote}
        </p>
      )}

      {m.status === 'disputed' && (
        <div className="rounded-2xl bg-negative/10 p-3 text-[0.8125rem]">
          <p className="flex items-center gap-2 font-semibold text-negative">
            <Scale className="h-4 w-4" /> Disputed {fmtDateTime(m.disputedAt)} by {m.disputedBy === c.smeUid ? c.smeName : c.buyerName || 'Buyer'}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-muted">{m.disputeReason}</p>
        </div>
      )}

      {m.resolutionNote && m.status !== 'disputed' && (
        <p className="text-[0.75rem] text-faint">Dispute resolved {fmtDateTime(m.resolvedAt)}: {m.resolutionNote}</p>
      )}

      {/* Payment request — the stage is approved and money should move */}
      {m.status === 'approved' && (
        <div className="rounded-2xl bg-accent-soft p-3.5">
          <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-accent">
            <Banknote className="h-4 w-4" /> Payment request · approved {fmtDateTime(m.approvedAt)}
          </p>
          <div className="mt-2 grid gap-2 text-[0.8125rem] sm:grid-cols-3">
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Amount</p>
              <p className="tnum font-bold text-ink">{zar(m.amount)}</p>
            </div>
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Pay to</p>
              <p className="truncate font-semibold text-ink">
                {c.paymentInstructions.method === 'payshap' ? `PayShap ${c.paymentInstructions.payshapId}` : `${c.paymentInstructions.bankName || 'Bank'} ${c.paymentInstructions.accountNumber}`}
              </p>
            </div>
            <div>
              <p className="text-[0.6875rem] uppercase tracking-[0.08em] text-muted">Reference</p>
              <button onClick={() => copy(ref)} className="inline-flex items-center gap-1.5 font-mono font-bold text-ink hover:text-accent">
                {ref} <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {m.status === 'paid' && (
        <p className="text-[0.75rem] text-positive">
          Paid {fmtDateTime(m.paidAt)} · bank ref <span className="font-mono">{m.paymentReference}</span>
        </p>
      )}

      {/* Role-gated actions (mirror of firestore.rules) */}
      {active && (
        <div className="flex flex-wrap gap-2 pt-1">
          {isSme && m.status === 'pending' && (
            <Button variant={firstOpen ? 'accent' : 'soft'} onClick={() => onAction('evidence')} disabled={busy}>
              <Upload className="h-4 w-4" /> Submit evidence
            </Button>
          )}
          {isSme && m.status === 'evidence_submitted' && (
            <Button variant="soft" onClick={onWithdraw} disabled={busy}>
              <Undo2 className="h-4 w-4" /> Withdraw evidence
            </Button>
          )}
          {isBuyer && m.status === 'evidence_submitted' && (
            <>
              <Button variant="accent" onClick={onApprove} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" /> Approve stage
              </Button>
              <Button variant="soft" onClick={() => onAction('reject')} disabled={busy}>
                <XCircle className="h-4 w-4" /> Return
              </Button>
            </>
          )}
          {isBuyer && m.status === 'approved' && (
            <Button variant="accent" onClick={() => onAction('pay')} disabled={busy}>
              <Banknote className="h-4 w-4" /> I have paid — record reference
            </Button>
          )}
          {(m.status === 'evidence_submitted' || m.status === 'approved') && (
            <Button variant="soft" onClick={() => onAction('dispute')} disabled={busy} className="ml-auto">
              <AlertTriangle className="h-4 w-4" /> Dispute
            </Button>
          )}
          {m.status === 'disputed' && (
            <Button variant="solid" onClick={() => onAction('resolve')} disabled={busy}>
              <Scale className="h-4 w-4" /> Resolve dispute
            </Button>
          )}
        </div>
      )}
    </Tile>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────

const ActionModal: React.FC<{
  modal: NonNullable<ModalKind>;
  contract: ContractView;
  role: Role;
  busy: boolean;
  onClose: () => void;
  run: (label: string, fn: () => Promise<void>) => Promise<void>;
}> = ({ modal, contract: c, role, busy, onClose, run }) => {
  const [text, setText] = useState('');
  const [evType, setEvType] = useState<EvidenceType>('delivery_confirmation');
  const [file, setFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [outcome, setOutcome] = useState<'pending' | 'approved'>('pending');
  const [name, setName] = useState(useAppStore.getState().profile?.businessName || '');
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickFile = (f: File) => {
    setErr(null);
    if (!/^(image\/(png|jpeg|jpg|webp)|application\/pdf)$/.test(f.type)) return setErr('Only PNG, JPEG, WebP images or PDF files are accepted.');
    if (f.size > 500_000) return setErr('File is too large — keep evidence under 500 KB (a phone photo at medium quality is fine).');
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      if (dataUrl.length > LIMITS.evidenceDataUrl) return setErr('File is too large after encoding. Please use a smaller file.');
      setFile({ name: f.name.slice(0, LIMITS.fileName), dataUrl });
    };
    r.onerror = () => setErr('Could not read that file.');
    r.readAsDataURL(f);
  };

  const m = 'm' in modal ? modal.m : null;

  const titles: Record<NonNullable<ModalKind>['kind'], string> = {
    evidence: `Submit evidence — ${m?.title}`,
    reject: `Return stage — ${m?.title}`,
    pay: `Record payment — ${m?.title}`,
    dispute: `Raise a dispute — ${m?.title}`,
    resolve: `Resolve dispute — ${m?.title}`,
    cancel: 'Cancel this agreement',
    decline: 'Decline this proposal',
    accept: 'Accept this agreement',
  };

  const submit = () => {
    setErr(null);
    switch (modal.kind) {
      case 'evidence':
        if (!text.trim() && !file) return setErr('Add a note or attach a file as proof.');
        return run('Evidence submitted — the buyer has been asked to approve.', () =>
          svc.submitEvidence(c.id, modal.m, { type: evType, note: text, fileName: file?.name ?? null, dataUrl: file?.dataUrl ?? null }),
        );
      case 'reject':
        if (!text.trim()) return setErr('Tell the supplier what needs to change.');
        return run('Stage returned to the supplier.', () => svc.rejectEvidence(c.id, modal.m, text));
      case 'pay':
        if (!text.trim()) return setErr('Enter the reference from your bank / PayShap confirmation.');
        return run('Payment recorded.', () => svc.recordPayment(c.id, modal.m, text));
      case 'dispute':
        if (!text.trim()) return setErr('Describe the dispute.');
        return run('Dispute raised. Payment for this stage is paused.', () => svc.raiseDispute(c.id, modal.m, role, text));
      case 'resolve':
        if (!text.trim()) return setErr('Record how the dispute was resolved.');
        return run('Dispute resolved.', () => svc.resolveDispute(c.id, modal.m, role, outcome, text));
      case 'cancel':
        if (!text.trim()) return setErr('Give a reason — it is recorded for both parties.');
        return run('Agreement cancelled.', () => svc.cancelContract(c, text));
      case 'decline':
        if (!text.trim()) return setErr('Give a reason so the supplier understands.');
        return run('Proposal declined.', () => svc.declineContract(c, text));
      case 'accept':
        if (!name.trim()) return setErr('Enter your business name as it should appear on the agreement.');
        return run('Agreement accepted. Terms are now locked.', () => svc.acceptContract(c, name));
    }
  };

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="glass-strong animate-rise w-full max-w-lg rounded-[24px] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <p className="text-[1.0625rem] font-bold text-ink">{titles[modal.kind]}</p>

        {modal.kind === 'accept' && (
          <div className="mt-3 space-y-3 text-[0.875rem] text-muted">
            <p>
              You are accepting <strong className="text-ink">{zar(c.totalValue)}</strong> across {c.milestoneCount} stages with {c.smeName}. On acceptance the value, stages, percentages and dispute rules are <strong className="text-ink">locked</strong> for both parties. You only pay a stage after you approve its evidence.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[0.75rem] font-medium">Your business name on this agreement</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none" />
            </label>
          </div>
        )}

        {modal.kind === 'evidence' && (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_TYPES.map((t) => (
                <button key={t.value} onClick={() => setEvType(t.value)} className={'rounded-full px-3 py-1.5 text-[0.75rem] font-semibold transition-colors ' + (evType === t.value ? 'bg-ink text-canvas' : 'bg-surface-inset text-muted hover:text-ink')}>
                  {t.label}
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={2000} placeholder="Describe what was completed…" className="w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:bg-surface-inset focus:outline-none" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = ''; }} />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="soft" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" /> {file ? 'Replace file' : 'Attach photo / PDF'}
              </Button>
              {file && <span className="truncate text-[0.8125rem] text-muted">{file.name}</span>}
            </div>
          </div>
        )}

        {modal.kind === 'resolve' && (
          <div className="mt-3 flex gap-2">
            <button onClick={() => setOutcome('pending')} className={'flex-1 rounded-2xl px-3 py-2.5 text-[0.8125rem] font-semibold ' + (outcome === 'pending' ? 'bg-ink text-canvas' : 'bg-surface-inset text-muted')}>
              Return for rework
            </button>
            <button onClick={() => setOutcome('approved')} disabled={role !== 'buyer'} title={role !== 'buyer' ? 'Only the buyer can approve payment' : ''} className={'flex-1 rounded-2xl px-3 py-2.5 text-[0.8125rem] font-semibold disabled:opacity-40 ' + (outcome === 'approved' ? 'bg-accent text-accent-contrast' : 'bg-surface-inset text-muted')}>
              Approve for payment
            </button>
          </div>
        )}

        {['reject', 'pay', 'dispute', 'resolve', 'cancel', 'decline'].includes(modal.kind) && (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={modal.kind === 'pay' ? 1 : 3}
            maxLength={modal.kind === 'pay' ? 64 : modal.kind === 'reject' || modal.kind === 'cancel' || modal.kind === 'decline' ? 300 : 2000}
            placeholder={
              modal.kind === 'pay' ? 'Bank / PayShap payment reference' :
              modal.kind === 'reject' ? 'What needs to change before you can approve?' :
              modal.kind === 'dispute' ? 'What is being disputed and why?' :
              modal.kind === 'resolve' ? 'How was it resolved?' : 'Reason'
            }
            className="mt-3 w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:bg-surface-inset focus:outline-none"
          />
        )}

        {modal.kind === 'pay' && m && (
          <p className="mt-2 text-[0.75rem] text-faint">
            Confirm you have transferred <strong className="text-ink">{zar(m.amount)}</strong> using reference <span className="font-mono">{paymentReferenceFor(c.id, m.order)}</span>. This is recorded permanently in the audit trail.
          </p>
        )}

        {err && <p className="mt-3 rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <GhostButton pill onClick={onClose} disabled={busy}>Cancel</GhostButton>
          <Button variant={modal.kind === 'cancel' || modal.kind === 'decline' || modal.kind === 'dispute' ? 'solid' : 'accent'} onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractDetail;
