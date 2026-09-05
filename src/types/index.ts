// ─────────────────────────────────────────────────────────────────────
// PLEXUS — Progressive Payment Contracts data model
//
// Design notes (security):
//  • Contracts are top-level documents shared by exactly two parties: the
//    SME (supplier, gets paid) and the Buyer (pays against milestones).
//  • Milestones are SUB-DOCUMENTS, not an array on the contract. That lets
//    Firestore rules lock each milestone's amount/terms once the agreement
//    is active and enforce a strict, role-gated state machine per document.
//  • Every state change is written in the same batch as an append-only
//    audit event whose timestamp is set by the server.
//  • Sensitive KYC data (verification) is private to its owner. Only a
//    minimal public profile (name + verification status) is readable by
//    other authenticated users.
// ─────────────────────────────────────────────────────────────────────

export type Role = 'sme' | 'buyer';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

/**
 * draft     → SME still editing, buyer cannot see it
 * proposed  → SME has accepted terms and sent to buyer (visible to buyer by email)
 * active    → Buyer accepted; core terms are LOCKED
 * completed → every milestone paid
 * cancelled → withdrawn / declined / cancelled (terminal)
 */
export type ContractStatus = 'draft' | 'proposed' | 'active' | 'completed' | 'cancelled';

/**
 * pending            → work not yet evidenced
 * evidence_submitted → SME uploaded proof, awaiting buyer approval
 * approved           → buyer approved; payment request is live
 * paid               → buyer recorded payment with a bank reference
 * disputed           → either party raised a dispute (from evidence_submitted / approved)
 */
export type MilestoneStatus = 'pending' | 'evidence_submitted' | 'approved' | 'paid' | 'disputed';

export type EvidenceType =
  | 'buyer_acknowledgement'
  | 'delivery_confirmation'
  | 'job_card'
  | 'photo'
  | 'document'
  | 'other';

export type PaymentMethod = 'eft' | 'payshap';

export interface PaymentInstructions {
  method: PaymentMethod;
  accountHolder: string;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  /** PayShap proxy (ShapID) — usually a mobile number. */
  payshapId?: string;
}

export interface Contract {
  id: string;
  smeUid: string;
  smeName: string;
  /** Set when the invited buyer accepts (claims) the contract. */
  buyerUid: string | null;
  /** Lower-cased invitation email — how the buyer finds the proposal. */
  buyerEmail: string;
  buyerName: string;
  title: string;
  scope: string;
  totalValue: number;
  currency: 'ZAR';
  /** ISO date (YYYY-MM-DD) */
  expectedDelivery: string;
  paymentInstructions: PaymentInstructions;
  disputeRules: string;
  status: ContractStatus;
  milestoneCount: number;
  smeAcceptedAt: Date | null;
  buyerAcceptedAt: Date | null;
  /** Set the moment the buyer accepts — core fields are immutable after this. */
  lockedAt: Date | null;
  completedAt: Date | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MilestoneEvidence {
  type: EvidenceType;
  note: string;
  fileName: string | null;
  /** Small image/PDF data URL. Hard-capped in rules. */
  dataUrl: string | null;
  submittedBy: string;
  submittedAt: Date;
}

export interface Milestone {
  id: string;
  contractId: string;
  order: number;
  title: string;
  /** Share of the contract, 0–100. */
  percent: number;
  amount: number;
  /** What must be true for this stage to be claimable. */
  dueCondition: string;
  /** What proof the buyer will accept. */
  acceptanceRule: string;
  status: MilestoneStatus;
  evidence: MilestoneEvidence | null;
  rejectionNote: string | null;
  approvedAt: Date | null;
  paidAt: Date | null;
  /** Bank / PayShap reference the buyer recorded when paying. */
  paymentReference: string | null;
  disputeReason: string | null;
  disputedBy: string | null;
  disputedAt: Date | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  updatedAt: Date;
}

export type ContractEventType =
  | 'contract_created'
  | 'contract_proposed'
  | 'contract_withdrawn'
  | 'contract_accepted'
  | 'contract_declined'
  | 'contract_cancelled'
  | 'contract_completed'
  | 'milestone_evidence_submitted'
  | 'milestone_evidence_withdrawn'
  | 'milestone_rejected'
  | 'milestone_approved'
  | 'milestone_paid'
  | 'milestone_disputed'
  | 'milestone_dispute_resolved';

/** Append-only audit record. `at` is always the server time. */
export interface ContractEvent {
  id: string;
  type: ContractEventType;
  actorUid: string;
  actorRole: Role;
  milestoneId: string | null;
  summary: string;
  at: Date;
}

/**
 * PRIVATE — only the owner can read. Full identity documents never touch
 * Firestore: only last-4 digits are stored as a reference. Full KYC happens
 * with the regulated verification partner (see PLEXUS_TRUST_AND_COMPLIANCE.md).
 */
export interface Verification {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  taxNumber: string;
  ownerFullName: string;
  ownerIdLast4: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  accountHolder: string;
  accountNumberLast4: string;
  status: VerificationStatus;
  submittedAt: Date | null;
  updatedAt: Date;
}

/** Readable by any signed-in user — deliberately minimal. */
export interface PublicProfile {
  uid: string;
  businessName: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
}

/** Contract as the current user sees it. */
export interface ContractView extends Contract {
  myRole: Role;
  /** Buyer invited by email but not yet claimed the contract. */
  awaitingMyAcceptance: boolean;
}

// Shared limits — mirrored exactly in firestore.rules.
export const LIMITS = {
  title: 120,
  scope: 2000,
  name: 120,
  email: 254,
  shortText: 300,
  longText: 2000,
  reference: 64,
  fileName: 160,
  evidenceDataUrl: 700_000,
  maxMilestones: 12,
  maxContractValue: 100_000_000,
} as const;
