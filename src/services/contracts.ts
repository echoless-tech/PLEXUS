/**
 * Contract service — every mutation is ONE atomic batch containing the state
 * change and its audit event, so history can never drift from state.
 * All meaningful timestamps are `serverTimestamp()`; the rules reject any
 * document whose stamps differ from `request.time`.
 *
 * Field shapes below must match firestore.rules exactly (rules use hasAll,
 * so every key is written explicitly, nulls included).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type {
  Contract,
  ContractEvent,
  ContractEventType,
  ContractPaymentDetails,
  ContractView,
  EvidenceType,
  Milestone,
  PaymentInstructions,
  Role,
} from '../types';
import { LIMITS } from '../types';
import { cents } from '../lib/format';

// ─── Helpers ─────────────────────────────────────────────────────────

function requireUser() {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');
  return { uid: u.uid, email: (u.email || '').toLowerCase() };
}

const toDate = (v: unknown): Date | null =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : null;

const newId = () => crypto.randomUUID();

const contractRef = (cid: string) => doc(db, 'contracts', cid);
const milestoneRef = (cid: string, mid: string) => doc(db, 'contracts', cid, 'milestones', mid);
const eventsCol = (cid: string) => collection(db, 'contracts', cid, 'events');

function eventDoc(
  batch: ReturnType<typeof writeBatch>,
  cid: string,
  type: ContractEventType,
  actorRole: Role,
  summary: string,
  milestoneId: string | null = null,
) {
  const { uid } = requireUser();
  batch.set(doc(eventsCol(cid)), {
    type,
    actorUid: uid,
    actorRole,
    milestoneId,
    summary: summary.slice(0, 500),
    at: serverTimestamp(),
  });
}

function mapContract(id: string, d: Record<string, any>): Contract {
  return {
    id,
    smeUid: d.smeUid,
    smeName: d.smeName,
    buyerUid: d.buyerUid ?? null,
    buyerEmail: d.buyerEmail,
    buyerName: d.buyerName ?? '',
    title: d.title,
    scope: d.scope ?? '',
    totalValue: d.totalValue,
    currency: 'ZAR',
    expectedDelivery: d.expectedDelivery,
    disputeRules: d.disputeRules ?? '',
    seekingFunding: d.seekingFunding === true,
    status: d.status,
    milestoneCount: d.milestoneCount,
    smeAcceptedAt: toDate(d.smeAcceptedAt),
    buyerAcceptedAt: toDate(d.buyerAcceptedAt),
    lockedAt: toDate(d.lockedAt),
    completedAt: toDate(d.completedAt),
    cancelledBy: d.cancelledBy ?? null,
    cancelReason: d.cancelReason ?? null,
    createdAt: toDate(d.createdAt) ?? new Date(),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
  };
}

function mapMilestone(id: string, d: Record<string, any>): Milestone {
  return {
    id,
    contractId: d.contractId,
    order: d.order,
    title: d.title,
    percent: d.percent,
    amount: d.amount,
    dueCondition: d.dueCondition ?? '',
    acceptanceRule: d.acceptanceRule ?? '',
    status: d.status,
    evidence: d.evidence
      ? { ...d.evidence, submittedAt: toDate(d.evidence.submittedAt) ?? new Date() }
      : null,
    rejectionNote: d.rejectionNote ?? null,
    approvedAt: toDate(d.approvedAt),
    paidAt: toDate(d.paidAt),
    paymentReference: d.paymentReference ?? null,
    disputeReason: d.disputeReason ?? null,
    disputedBy: d.disputedBy ?? null,
    disputedAt: toDate(d.disputedAt),
    resolutionNote: d.resolutionNote ?? null,
    resolvedBy: d.resolvedBy ?? null,
    resolvedAt: toDate(d.resolvedAt),
    updatedAt: toDate(d.updatedAt) ?? new Date(),
  };
}

export function toView(c: Contract): ContractView {
  const { uid, email } = requireUser();
  const myRole: Role =
    c.smeUid === uid ? 'sme' : c.buyerUid === uid || (c.buyerUid === null && c.buyerEmail === email) ? 'buyer' : 'funder';
  return {
    ...c,
    myRole,
    awaitingMyAcceptance:
      myRole === 'buyer' && c.buyerUid === null && c.buyerEmail === email && c.status === 'proposed',
  };
}

function roleOn(c: Contract): Role {
  const { uid } = requireUser();
  return c.smeUid === uid ? 'sme' : 'buyer';
}

// ─── Authoring input ─────────────────────────────────────────────────

export interface MilestoneInput {
  title: string;
  percent: number;
  dueCondition: string;
  acceptanceRule: string;
}

export interface ContractInput {
  title: string;
  scope: string;
  buyerEmail: string;
  buyerName: string;
  totalValue: number;
  expectedDelivery: string;
  paymentInstructions: PaymentInstructions;
  disputeRules: string;
  /** List this agreement's payment plan for funders. */
  seekingFunding?: boolean;
  milestones: MilestoneInput[];
}

/** Client-side guard. The rules enforce shape and role; arithmetic lives here. */
export function validateContractInput(input: ContractInput): string | null {
  if (!input.title.trim()) return 'Give the agreement a title.';
  if (input.title.length > LIMITS.title) return `Title must be under ${LIMITS.title} characters.`;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.buyerEmail.trim())) return 'Enter a valid buyer email.';
  if (!(input.totalValue > 0)) return 'Total value must be greater than zero.';
  if (input.totalValue > LIMITS.maxContractValue) return 'Total value exceeds the platform limit.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expectedDelivery)) return 'Choose an expected delivery date.';
  if (!input.paymentInstructions.accountHolder.trim()) return 'Enter the account holder to be paid.';
  if (input.paymentInstructions.method === 'payshap' && !input.paymentInstructions.payshapId?.trim())
    return 'Enter your PayShap ID.';
  if (input.paymentInstructions.method === 'eft' && !input.paymentInstructions.accountNumber?.trim())
    return 'Enter the bank account number to be paid into.';
  if (input.milestones.length < 1) return 'Add at least one payment stage.';
  if (input.milestones.length > LIMITS.maxMilestones) return `Maximum ${LIMITS.maxMilestones} stages.`;
  for (const m of input.milestones) {
    if (!m.title.trim()) return 'Every stage needs a title.';
    if (!(m.percent >= 0 && m.percent <= 100)) return 'Stage percentages must be between 0 and 100.';
  }
  const sum = cents(input.milestones.reduce((s, m) => s + Number(m.percent || 0), 0));
  if (Math.abs(sum - 100) > 0.01) return `Stages must add up to 100% (currently ${sum}%).`;
  return null;
}

/** Allocates the total across stages in cents; the last stage absorbs rounding. */
export function allocateAmounts(total: number, percents: number[]): number[] {
  const amounts = percents.map((p) => cents((total * p) / 100));
  const drift = cents(total - amounts.reduce((s, a) => s + a, 0));
  if (amounts.length) amounts[amounts.length - 1] = cents(amounts[amounts.length - 1] + drift);
  return amounts;
}

function paymentInstructionsDoc(p: PaymentInstructions): Record<string, string> {
  // Rules only allow known keys; drop empties so nothing stray is written.
  const out: Record<string, string> = {
    method: p.method,
    accountHolder: p.accountHolder.trim().slice(0, 120),
  };
  if (p.bankName?.trim()) out.bankName = p.bankName.trim().slice(0, 64);
  if (p.accountNumber?.trim()) out.accountNumber = p.accountNumber.trim().slice(0, 32);
  if (p.branchCode?.trim()) out.branchCode = p.branchCode.trim().slice(0, 16);
  if (p.payshapId?.trim()) out.payshapId = p.payshapId.trim().slice(0, 64);
  return out;
}

const privatePaymentRef = (cid: string) => doc(db, 'contracts', cid, 'private', 'payment');

// ─── Create / edit (draft phase) ─────────────────────────────────────

export async function createContract(input: ContractInput, smeName: string): Promise<string> {
  const err = validateContractInput(input);
  if (err) throw new Error(err);
  const { uid } = requireUser();
  const cid = newId();
  const batch = writeBatch(db);

  batch.set(contractRef(cid), {
    smeUid: uid,
    smeName: smeName.trim().slice(0, 120) || 'Supplier',
    buyerUid: null,
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    buyerName: input.buyerName.trim().slice(0, 120),
    title: input.title.trim().slice(0, LIMITS.title),
    scope: input.scope.trim().slice(0, LIMITS.scope),
    totalValue: cents(input.totalValue),
    currency: 'ZAR',
    expectedDelivery: input.expectedDelivery,
    disputeRules: input.disputeRules.trim().slice(0, LIMITS.longText),
    seekingFunding: input.seekingFunding === true,
    status: 'draft',
    milestoneCount: input.milestones.length,
    smeAcceptedAt: null,
    buyerAcceptedAt: null,
    lockedAt: null,
    completedAt: null,
    cancelledBy: null,
    cancelReason: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Settlement details live in a participant-only sub-document.
  batch.set(privatePaymentRef(cid), {
    details: paymentInstructionsDoc(input.paymentInstructions),
    updatedAt: serverTimestamp(),
  });

  const amounts = allocateAmounts(cents(input.totalValue), input.milestones.map((m) => m.percent));
  input.milestones.forEach((m, i) => {
    batch.set(milestoneRef(cid, newId()), {
      contractId: cid,
      order: i,
      title: m.title.trim().slice(0, LIMITS.title),
      percent: Number(m.percent),
      amount: amounts[i],
      dueCondition: m.dueCondition.trim().slice(0, LIMITS.shortText),
      acceptanceRule: m.acceptanceRule.trim().slice(0, LIMITS.shortText),
      status: 'pending',
      evidence: null,
      rejectionNote: null,
      approvedAt: null,
      paidAt: null,
      paymentReference: null,
      disputeReason: null,
      disputedBy: null,
      disputedAt: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
      updatedAt: serverTimestamp(),
    });
  });

  eventDoc(batch, cid, 'contract_created', 'sme', `Draft agreement "${input.title.trim()}" created for ${input.buyerEmail.trim()}.`);
  await batch.commit();
  return cid;
}

/** Replaces a draft's header + full milestone schedule. Draft only. */
export async function updateDraft(c: Contract, existing: Milestone[], input: ContractInput): Promise<void> {
  const err = validateContractInput(input);
  if (err) throw new Error(err);
  if (c.status !== 'draft') throw new Error('Only drafts can be edited. Withdraw the proposal first.');
  const batch = writeBatch(db);

  batch.set(contractRef(c.id), {
    smeUid: c.smeUid,
    smeName: c.smeName,
    buyerUid: null,
    buyerEmail: input.buyerEmail.trim().toLowerCase(),
    buyerName: input.buyerName.trim().slice(0, 120),
    title: input.title.trim().slice(0, LIMITS.title),
    scope: input.scope.trim().slice(0, LIMITS.scope),
    totalValue: cents(input.totalValue),
    currency: 'ZAR',
    expectedDelivery: input.expectedDelivery,
    disputeRules: input.disputeRules.trim().slice(0, LIMITS.longText),
    seekingFunding: input.seekingFunding === true,
    status: 'draft',
    milestoneCount: input.milestones.length,
    smeAcceptedAt: null,
    buyerAcceptedAt: null,
    lockedAt: null,
    completedAt: null,
    cancelledBy: null,
    cancelReason: null,
    createdAt: Timestamp.fromDate(c.createdAt),
    updatedAt: serverTimestamp(),
  });

  batch.set(privatePaymentRef(c.id), {
    details: paymentInstructionsDoc(input.paymentInstructions),
    updatedAt: serverTimestamp(),
  });

  existing.forEach((m) => batch.delete(milestoneRef(c.id, m.id)));
  const amounts = allocateAmounts(cents(input.totalValue), input.milestones.map((m) => m.percent));
  input.milestones.forEach((m, i) => {
    batch.set(milestoneRef(c.id, newId()), {
      contractId: c.id,
      order: i,
      title: m.title.trim().slice(0, LIMITS.title),
      percent: Number(m.percent),
      amount: amounts[i],
      dueCondition: m.dueCondition.trim().slice(0, LIMITS.shortText),
      acceptanceRule: m.acceptanceRule.trim().slice(0, LIMITS.shortText),
      status: 'pending',
      evidence: null,
      rejectionNote: null,
      approvedAt: null,
      paidAt: null,
      paymentReference: null,
      disputeReason: null,
      disputedBy: null,
      disputedAt: null,
      resolutionNote: null,
      resolvedBy: null,
      resolvedAt: null,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

// ─── Header transitions ──────────────────────────────────────────────

/** Helper: rewrite the header with a patch, preserving every other field. */
function headerWrite(c: Contract, patch: Record<string, unknown>) {
  return {
    smeUid: c.smeUid,
    smeName: c.smeName,
    buyerUid: c.buyerUid,
    buyerEmail: c.buyerEmail,
    buyerName: c.buyerName,
    title: c.title,
    scope: c.scope,
    totalValue: c.totalValue,
    currency: 'ZAR',
    expectedDelivery: c.expectedDelivery,
    disputeRules: c.disputeRules,
    seekingFunding: c.seekingFunding,
    status: c.status,
    milestoneCount: c.milestoneCount,
    smeAcceptedAt: c.smeAcceptedAt ? Timestamp.fromDate(c.smeAcceptedAt) : null,
    buyerAcceptedAt: c.buyerAcceptedAt ? Timestamp.fromDate(c.buyerAcceptedAt) : null,
    lockedAt: c.lockedAt ? Timestamp.fromDate(c.lockedAt) : null,
    completedAt: c.completedAt ? Timestamp.fromDate(c.completedAt) : null,
    cancelledBy: c.cancelledBy,
    cancelReason: c.cancelReason,
    createdAt: Timestamp.fromDate(c.createdAt),
    updatedAt: serverTimestamp(),
    ...patch,
  };
}

/** SME digitally accepts the terms and sends the proposal to the buyer. */
export async function proposeContract(c: Contract): Promise<void> {
  const batch = writeBatch(db);
  batch.set(contractRef(c.id), headerWrite(c, { status: 'proposed', smeAcceptedAt: serverTimestamp() }));
  eventDoc(batch, c.id, 'contract_proposed', 'sme', `Supplier accepted the terms and sent the agreement to ${c.buyerEmail}.`);
  await batch.commit();
}

export async function withdrawProposal(c: Contract): Promise<void> {
  const batch = writeBatch(db);
  batch.set(contractRef(c.id), headerWrite(c, { status: 'draft', smeAcceptedAt: null }));
  eventDoc(batch, c.id, 'contract_withdrawn', 'sme', 'Supplier withdrew the proposal back to draft.');
  await batch.commit();
}

export async function cancelContract(c: Contract, reason: string): Promise<void> {
  const { uid } = requireUser();
  const role = roleOn(c);
  const batch = writeBatch(db);
  batch.set(
    contractRef(c.id),
    headerWrite(c, { status: 'cancelled', cancelledBy: uid, cancelReason: reason.trim().slice(0, 300) || 'Cancelled' }),
  );
  eventDoc(batch, c.id, 'contract_cancelled', role, `Agreement cancelled: ${reason.trim().slice(0, 200)}`);
  await batch.commit();
}

/** Invited buyer accepts — claims the contract and LOCKS all terms. */
export async function acceptContract(c: Contract, buyerName: string): Promise<void> {
  const { uid } = requireUser();
  const batch = writeBatch(db);
  batch.set(
    contractRef(c.id),
    headerWrite(c, {
      buyerUid: uid,
      buyerName: buyerName.trim().slice(0, 120) || 'Buyer',
      buyerAcceptedAt: serverTimestamp(),
      lockedAt: serverTimestamp(),
      status: 'active',
    }),
  );
  eventDoc(batch, c.id, 'contract_accepted', 'buyer', 'Buyer accepted the agreement. Terms are now locked.');
  await batch.commit();
}

export async function declineContract(c: Contract, reason: string): Promise<void> {
  const { uid } = requireUser();
  const batch = writeBatch(db);
  batch.set(
    contractRef(c.id),
    headerWrite(c, { status: 'cancelled', cancelledBy: uid, cancelReason: reason.trim().slice(0, 300) || 'Declined' }),
  );
  eventDoc(batch, c.id, 'contract_declined', 'buyer', `Buyer declined the proposal: ${reason.trim().slice(0, 200)}`);
  await batch.commit();
}

export async function completeContract(c: Contract): Promise<void> {
  const batch = writeBatch(db);
  batch.set(contractRef(c.id), headerWrite(c, { status: 'completed', completedAt: serverTimestamp() }));
  eventDoc(batch, c.id, 'contract_completed', roleOn(c), 'All stages paid. Agreement closed out.');
  await batch.commit();
}

/** Participant-only settlement details. Returns null when not permitted (funders). */
export async function fetchPaymentDetails(cid: string): Promise<ContractPaymentDetails | null> {
  try {
    const snap = await getDoc(privatePaymentRef(cid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return { ...(d.details as PaymentInstructions), updatedAt: toDate(d.updatedAt) ?? new Date() };
  } catch {
    return null;
  }
}

// ─── Milestone workflow (active phase) ───────────────────────────────

function milestoneWrite(m: Milestone, patch: Record<string, unknown>) {
  const ts = (d: Date | null) => (d ? Timestamp.fromDate(d) : null);
  return {
    contractId: m.contractId,
    order: m.order,
    title: m.title,
    percent: m.percent,
    amount: m.amount,
    dueCondition: m.dueCondition,
    acceptanceRule: m.acceptanceRule,
    status: m.status,
    evidence: m.evidence
      ? { ...m.evidence, submittedAt: Timestamp.fromDate(m.evidence.submittedAt) }
      : null,
    rejectionNote: m.rejectionNote,
    approvedAt: ts(m.approvedAt),
    paidAt: ts(m.paidAt),
    paymentReference: m.paymentReference,
    disputeReason: m.disputeReason,
    disputedBy: m.disputedBy,
    disputedAt: ts(m.disputedAt),
    resolutionNote: m.resolutionNote,
    resolvedBy: m.resolvedBy,
    resolvedAt: ts(m.resolvedAt),
    updatedAt: serverTimestamp(),
    ...patch,
  };
}

export interface EvidenceInput {
  type: EvidenceType;
  note: string;
  fileName: string | null;
  dataUrl: string | null;
}

export async function submitEvidence(cid: string, m: Milestone, ev: EvidenceInput): Promise<void> {
  const { uid } = requireUser();
  if (ev.dataUrl && ev.dataUrl.length > LIMITS.evidenceDataUrl)
    throw new Error('Attachment is too large. Please use a smaller image or PDF (max ~500 KB).');
  const batch = writeBatch(db);
  batch.set(
    milestoneRef(cid, m.id),
    milestoneWrite(m, {
      status: 'evidence_submitted',
      rejectionNote: null,
      evidence: {
        type: ev.type,
        note: ev.note.trim().slice(0, LIMITS.longText),
        fileName: ev.fileName ? ev.fileName.slice(0, LIMITS.fileName) : null,
        dataUrl: ev.dataUrl,
        submittedBy: uid,
        submittedAt: serverTimestamp(),
      },
    }),
  );
  eventDoc(batch, cid, 'milestone_evidence_submitted', 'sme', `Evidence submitted for "${m.title}" (${ev.type.replace(/_/g, ' ')}).`, m.id);
  await batch.commit();
}

export async function withdrawEvidence(cid: string, m: Milestone): Promise<void> {
  const batch = writeBatch(db);
  batch.set(milestoneRef(cid, m.id), milestoneWrite(m, { status: 'pending', evidence: null }));
  eventDoc(batch, cid, 'milestone_evidence_withdrawn', 'sme', `Evidence withdrawn for "${m.title}".`, m.id);
  await batch.commit();
}

export async function approveMilestone(cid: string, m: Milestone): Promise<void> {
  const batch = writeBatch(db);
  batch.set(milestoneRef(cid, m.id), milestoneWrite(m, { status: 'approved', approvedAt: serverTimestamp() }));
  eventDoc(batch, cid, 'milestone_approved', 'buyer', `Buyer approved "${m.title}". Payment request issued.`, m.id);
  await batch.commit();
}

export async function rejectEvidence(cid: string, m: Milestone, note: string): Promise<void> {
  const batch = writeBatch(db);
  batch.set(
    milestoneRef(cid, m.id),
    milestoneWrite(m, { status: 'pending', rejectionNote: note.trim().slice(0, LIMITS.shortText) || 'Not accepted' }),
  );
  eventDoc(batch, cid, 'milestone_rejected', 'buyer', `Buyer returned "${m.title}": ${note.trim().slice(0, 200)}`, m.id);
  await batch.commit();
}

export async function recordPayment(cid: string, m: Milestone, reference: string): Promise<void> {
  const ref = reference.trim().slice(0, LIMITS.reference);
  if (!ref) throw new Error('Enter the payment reference from your bank.');
  const batch = writeBatch(db);
  batch.set(
    milestoneRef(cid, m.id),
    milestoneWrite(m, { status: 'paid', paidAt: serverTimestamp(), paymentReference: ref }),
  );
  eventDoc(batch, cid, 'milestone_paid', 'buyer', `Payment recorded for "${m.title}" — ref ${ref}.`, m.id);
  await batch.commit();
}

export async function raiseDispute(cid: string, m: Milestone, role: Role, reason: string): Promise<void> {
  const { uid } = requireUser();
  const batch = writeBatch(db);
  batch.set(
    milestoneRef(cid, m.id),
    milestoneWrite(m, {
      status: 'disputed',
      disputeReason: reason.trim().slice(0, LIMITS.longText) || 'Disputed',
      disputedBy: uid,
      disputedAt: serverTimestamp(),
    }),
  );
  eventDoc(batch, cid, 'milestone_disputed', role, `Dispute raised on "${m.title}": ${reason.trim().slice(0, 200)}`, m.id);
  await batch.commit();
}

export async function resolveDispute(
  cid: string,
  m: Milestone,
  role: Role,
  outcome: 'pending' | 'approved',
  note: string,
): Promise<void> {
  const { uid } = requireUser();
  if (outcome === 'approved' && role !== 'buyer') throw new Error('Only the buyer can resolve a dispute by approving payment.');
  const batch = writeBatch(db);
  batch.set(
    milestoneRef(cid, m.id),
    milestoneWrite(m, {
      status: outcome,
      resolutionNote: note.trim().slice(0, LIMITS.longText) || 'Resolved',
      resolvedBy: uid,
      resolvedAt: serverTimestamp(),
      approvedAt: outcome === 'approved' ? serverTimestamp() : null,
    }),
  );
  eventDoc(
    batch,
    cid,
    'milestone_dispute_resolved',
    role,
    `Dispute on "${m.title}" resolved → ${outcome === 'approved' ? 'approved for payment' : 'returned for rework'}. ${note.trim().slice(0, 160)}`,
    m.id,
  );
  await batch.commit();
}

// ─── Reads ───────────────────────────────────────────────────────────

/** Everything the current user is party to: as supplier, as buyer, or invited. */
export async function fetchMyContracts(): Promise<ContractView[]> {
  const { uid, email } = requireUser();
  const col = collection(db, 'contracts');
  const [asSme, asBuyer, invited] = await Promise.all([
    getDocs(query(col, where('smeUid', '==', uid))),
    getDocs(query(col, where('buyerUid', '==', uid))),
    email
      ? getDocs(
          query(
            col,
            where('buyerEmail', '==', email),
            where('buyerUid', '==', null),
            where('status', '==', 'proposed'),
          ),
        )
      : Promise.resolve(null),
  ]);
  const seen = new Map<string, Contract>();
  for (const snap of [asSme, asBuyer, invited]) {
    snap?.docs.forEach((d) => seen.set(d.id, mapContract(d.id, d.data())));
  }
  return [...seen.values()]
    .map(toView)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function fetchContract(cid: string): Promise<ContractView | null> {
  const snap = await getDoc(contractRef(cid));
  return snap.exists() ? toView(mapContract(snap.id, snap.data())) : null;
}

/**
 * Funder view: the live agreements of every business that is currently open to
 * funding. The rules resolve funder access per SME (the SME's profile flag),
 * so this runs one constrained query per business rather than a global one.
 */
export async function fetchFundingOpportunities(smeUids: string[]): Promise<ContractView[]> {
  const lists = await Promise.all(smeUids.map((uid) => fetchSmeFundingContracts(uid).catch(() => [] as ContractView[])));
  return lists.flat().sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** Funder view of one SME: its live agreements (allowed only while the SME is open to funding). */
export async function fetchSmeFundingContracts(smeUid: string): Promise<ContractView[]> {
  const col = collection(db, 'contracts');
  const snap = await getDocs(
    query(col, where('smeUid', '==', smeUid), where('status', 'in', ['proposed', 'active', 'completed'])),
  );
  return snap.docs
    .map((d) => toView(mapContract(d.id, d.data())))
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export function subscribeContract(
  cid: string,
  cb: (c: ContractView | null, milestones: Milestone[], events: ContractEvent[]) => void,
  onError: (e: Error) => void,
): Unsubscribe {
  let contract: ContractView | null = null;
  let milestones: Milestone[] = [];
  let events: ContractEvent[] = [];
  const emit = () => cb(contract, milestones, events);

  const u1 = onSnapshot(
    contractRef(cid),
    (snap) => {
      contract = snap.exists() ? toView(mapContract(snap.id, snap.data())) : null;
      emit();
    },
    onError,
  );
  const u2 = onSnapshot(
    query(collection(db, 'contracts', cid, 'milestones'), orderBy('order', 'asc')),
    (snap) => {
      milestones = snap.docs.map((d) => mapMilestone(d.id, d.data()));
      emit();
    },
    onError,
  );
  const u3 = onSnapshot(
    query(eventsCol(cid), orderBy('at', 'desc')),
    (snap) => {
      events = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          type: x.type,
          actorUid: x.actorUid,
          actorRole: x.actorRole,
          milestoneId: x.milestoneId ?? null,
          summary: x.summary,
          at: toDate(x.at) ?? new Date(),
        };
      });
      emit();
    },
    onError,
  );
  return () => {
    u1();
    u2();
    u3();
  };
}

export async function fetchMilestones(cid: string): Promise<Milestone[]> {
  const snap = await getDocs(query(collection(db, 'contracts', cid, 'milestones'), orderBy('order', 'asc')));
  return snap.docs.map((d) => mapMilestone(d.id, d.data()));
}

/** Rolled-up money position across a set of contracts (needs their milestones). */
export function summarise(milestones: Milestone[]) {
  const paid = milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
  const approved = milestones.filter((m) => m.status === 'approved').reduce((s, m) => s + m.amount, 0);
  const total = milestones.reduce((s, m) => s + m.amount, 0);
  return { paid: cents(paid), awaitingPayment: cents(approved), outstanding: cents(total - paid), total: cents(total) };
}
