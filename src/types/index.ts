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

export type Role = 'sme' | 'buyer' | 'funder';

/** Chosen once at sign-up / first login. Write-once in the rules. */
export type AccountType = 'business' | 'funder';

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
  disputeRules: string;
  /**
   * Legacy per-agreement listing flag (kept for schema compatibility; no UI).
   * Funder visibility is now governed by the SME profile's `seekingFunding`
   * and funders choose specific plans via `fundings`.
   */
  seekingFunding: boolean;
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

/**
 * contracts/{cid}/private/payment — the SME's settlement details. Readable
 * only by the two parties; funders never see it. Written with the contract
 * (draft) and locked with it.
 */
export interface ContractPaymentDetails extends PaymentInstructions {
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
  | 'contract_listed_for_funding'
  | 'contract_unlisted_for_funding'
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
  /** Funders only — FSP / NCR / other licence reference, if any. */
  licenceNumber: string;
  status: VerificationStatus;
  submittedAt: Date | null;
  updatedAt: Date;
}

export type Industry =
  | 'manufacturing'
  | 'construction'
  | 'retail'
  | 'food'
  | 'services'
  | 'logistics'
  | 'technology'
  | 'agriculture'
  | 'creative'
  | 'other';

/**
 * Readable by any signed-in user. Deliberately holds only what a business
 * would put on a storefront — never identity or bank data.
 */
export interface PublicProfile {
  uid: string;
  accountType: AccountType | null;
  businessName: string;
  verificationStatus: VerificationStatus;
  /** Small data-URL logo (rules cap the size). */
  logoDataUrl: string | null;
  industry: Industry | null;
  description: string;
  location: string;
  /** Contact address the business chooses to publish (may differ from login). */
  publicEmail: string;
  createdAt: Date;
  /**
   * Business-level switch: "we are looking for funding". While true, verified
   * funders can browse this business's live agreements and choose which
   * payment plans to fund. Nothing is funded until a funder explicitly
   * selects a plan and the business accepts.
   */
  seekingFunding: boolean;
  /**
   * Denormalised public rating snapshot so it can be shown in discovery lists
   * (Connect) where the viewer cannot read the underlying agreements. The
   * authoritative rating is still computed live from rule-enforced data on the
   * funder/statistics screens; in production this snapshot is written by a
   * Cloud Function that owns the calculation.
   */
  ratingScore?: number | null;
  ratingCount?: number;
}

export type DocumentKind = 'invoice' | 'receipt' | 'bank_statement' | 'other';

/**
 * fundings/{contractId}_{funderUid} — a funder's explicit choice to fund one
 * payment plan. One per funder per agreement (enforced by the doc id). A
 * business creating new agreements never creates fundings: the funder must
 * select each plan, and the business must accept.
 *
 *   offered   → funder selected the plan; awaiting the business
 *   accepted  → business accepted the funder for this plan
 *   declined  → business declined
 *   withdrawn → funder withdrew before a response
 */
export type FundingStatus = 'offered' | 'accepted' | 'declined' | 'withdrawn';

export interface Funding {
  id: string;
  contractId: string;
  contractTitle: string;
  smeUid: string;
  funderUid: string;
  funderName: string;
  note: string;
  status: FundingStatus;
  createdAt: Date;
  updatedAt: Date;
  respondedAt: Date | null;
}

/** pending_review → AI analysis not yet run (implemented later). */
export type DocumentAnalysisStatus = 'pending_review' | 'analysed' | 'flagged';

/**
 * profiles/{uid}/documents/{docId} — the business's own evidence of
 * performance (Run section). Owner-only. Small files inline as data URLs.
 */
export interface BusinessDocument {
  id: string;
  kind: DocumentKind;
  title: string;
  /** ISO date the document is dated (invoice date, statement month, etc.). */
  documentDate: string;
  /** Total on the document, in ZAR, if applicable. */
  amount: number | null;
  counterparty: string;
  note: string;
  fileName: string | null;
  mimeType: string | null;
  dataUrl: string | null;
  analysisStatus: DocumentAnalysisStatus;
  analysisNote: string | null;
  createdAt: Date;
}

/** Derived, never stored — computed from rule-enforced contract data. */
export interface BusinessRating {
  /** 0–5 */
  score: number;
  /** How much data backs the score. */
  confidence: 'none' | 'low' | 'medium' | 'high';
  agreementsTotal: number;
  agreementsActive: number;
  agreementsCompleted: number;
  agreementsCancelled: number;
  milestonesPaid: number;
  milestonesTotal: number;
  disputesRaised: number;
  rejectionsReceived: number;
  valueContracted: number;
  valuePaid: number;
  /** Fraction of stages approved without a return. */
  firstTimeApprovalRate: number | null;
}

/** Contract as the current user sees it. */
export interface ContractView extends Contract {
  /** 'funder' = read-only observer of a listed agreement. */
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
  logoDataUrl: 200_000,
  documentDataUrl: 700_000,
  maxMilestones: 12,
  maxContractValue: 100_000_000,
} as const;

export const INDUSTRY_LABELS: Record<Industry, string> = {
  manufacturing: 'Manufacturing',
  construction: 'Construction & trades',
  retail: 'Retail & wholesale',
  food: 'Food & hospitality',
  services: 'Professional services',
  logistics: 'Logistics & transport',
  technology: 'Technology',
  agriculture: 'Agriculture',
  creative: 'Creative & media',
  other: 'Other',
};
