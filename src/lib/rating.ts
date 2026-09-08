import type { BusinessRating, Contract, Milestone } from '../types';
import { cents } from './format';

/**
 * Derives a business rating from data the security rules guarantee:
 * agreement statuses, buyer-confirmed milestone states, disputes and
 * returns. Nothing here is self-reported, so an SME cannot inflate it.
 *
 * Score components (0–5):
 *   • Delivery      — share of stages paid vs contracted (buyer-confirmed)
 *   • Reliability   — completed vs cancelled agreements
 *   • Quality       — stages approved first time (no buyer return)
 *   • Trust         — dispute rate
 * Confidence rises with the volume of paid stages.
 */
export function computeRating(contracts: Contract[], milestones: Milestone[]): BusinessRating {
  const live = contracts.filter((c) => c.status !== 'draft');
  const completed = live.filter((c) => c.status === 'completed').length;
  const cancelled = live.filter((c) => c.status === 'cancelled').length;
  const active = live.filter((c) => c.status === 'active').length;

  const activeOrDone = new Set(live.filter((c) => c.status === 'active' || c.status === 'completed').map((c) => c.id));
  const ms = milestones.filter((m) => activeOrDone.has(m.contractId));

  const paid = ms.filter((m) => m.status === 'paid');
  const reviewed = ms.filter((m) => m.status === 'approved' || m.status === 'paid');
  const returned = ms.filter((m) => m.rejectionNote !== null);
  const disputed = ms.filter((m) => m.disputeReason !== null);

  const valueContracted = cents(live.filter((c) => c.status !== 'cancelled').reduce((s, c) => s + c.totalValue, 0));
  const valuePaid = cents(paid.reduce((s, m) => s + m.amount, 0));

  const firstTimeApprovalRate = reviewed.length ? (reviewed.length - returned.filter((m) => reviewed.includes(m)).length) / reviewed.length : null;

  if (paid.length === 0) {
    return {
      score: 0,
      confidence: 'none',
      agreementsTotal: live.length,
      agreementsActive: active,
      agreementsCompleted: completed,
      agreementsCancelled: cancelled,
      milestonesPaid: 0,
      milestonesTotal: ms.length,
      disputesRaised: disputed.length,
      rejectionsReceived: returned.length,
      valueContracted,
      valuePaid,
      firstTimeApprovalRate,
    };
  }

  const delivery = ms.length ? paid.length / ms.length : 0;
  const reliability = completed + cancelled ? completed / (completed + cancelled) : 0.75;
  const quality = firstTimeApprovalRate ?? 0.75;
  const trust = ms.length ? 1 - Math.min(1, disputed.length / ms.length) : 1;

  const raw = 5 * (0.4 * delivery + 0.25 * reliability + 0.2 * quality + 0.15 * trust);
  const score = Math.round(Math.max(0, Math.min(5, raw)) * 10) / 10;

  const confidence: BusinessRating['confidence'] = paid.length >= 12 ? 'high' : paid.length >= 4 ? 'medium' : 'low';

  return {
    score,
    confidence,
    agreementsTotal: live.length,
    agreementsActive: active,
    agreementsCompleted: completed,
    agreementsCancelled: cancelled,
    milestonesPaid: paid.length,
    milestonesTotal: ms.length,
    disputesRaised: disputed.length,
    rejectionsReceived: returned.length,
    valueContracted,
    valuePaid,
    firstTimeApprovalRate,
  };
}

export const confidenceLabel: Record<BusinessRating['confidence'], string> = {
  none: 'No paid stages yet',
  low: 'Early track record',
  medium: 'Established',
  high: 'Extensive track record',
};

/** Build a rating object from a profile's denormalised snapshot (Connect etc.). */
export function ratingFromProfile(p: { ratingScore?: number | null; ratingCount?: number }): BusinessRating | null {
  if (p.ratingScore == null) return null;
  const count = p.ratingCount ?? 0;
  const confidence: BusinessRating['confidence'] = count >= 12 ? 'high' : count >= 4 ? 'medium' : count > 0 ? 'low' : 'none';
  return {
    score: p.ratingScore,
    confidence,
    agreementsTotal: 0,
    agreementsActive: 0,
    agreementsCompleted: 0,
    agreementsCancelled: 0,
    milestonesPaid: count,
    milestonesTotal: count,
    disputesRaised: 0,
    rejectionsReceived: 0,
    valueContracted: 0,
    valuePaid: 0,
    firstTimeApprovalRate: null,
  };
}

/** Prefer the live rating; fall back to the profile snapshot when there's no live data. */
export function displayRating(live: BusinessRating, p: { ratingScore?: number | null; ratingCount?: number }): BusinessRating {
  if (live.confidence !== 'none') return live;
  return ratingFromProfile(p) ?? live;
}
