import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import type { Contract, Funding, FundingStatus } from '../types';

/**
 * Fundings — a funder's explicit, per-plan choice to fund an agreement.
 *
 * The document id is `${contractId}_${funderUid}`, which the rules require, so
 * each funder can hold exactly one funding per plan. Funding is opt-in on both
 * sides: the funder offers, the SME accepts or declines. Nothing here is ever
 * created by the business adding agreements.
 */

const col = () => collection(db, 'fundings');
export const fundingId = (contractId: string, funderUid: string) => `${contractId}_${funderUid}`;

function requireUser() {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');
  return u;
}

const toDate = (v: unknown): Date => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date());

function mapFunding(id: string, d: Record<string, any>): Funding {
  return {
    id,
    contractId: d.contractId,
    contractTitle: d.contractTitle ?? '',
    smeUid: d.smeUid,
    funderUid: d.funderUid,
    funderName: d.funderName ?? 'Funder',
    note: d.note ?? '',
    status: d.status as FundingStatus,
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    respondedAt: d.respondedAt ? toDate(d.respondedAt) : null,
  };
}

/**
 * Funder: choose to fund one payment plan. Requires a business open to funding
 * and a live agreement. A plan the funder previously withdrew from can be
 * offered again (the record flips back to `offered`); a declined offer is final.
 */
export async function offerFunding(c: Contract, funderName: string, note = ''): Promise<Funding> {
  const { uid } = requireUser();
  const id = fundingId(c.id, uid);
  const ref = doc(col(), id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const cur = mapFunding(id, existing.data());
    if (cur.status === 'withdrawn') {
      await updateDoc(ref, { status: 'offered', updatedAt: serverTimestamp() });
    } else if (cur.status === 'declined') {
      throw new Error(`${c.smeName} declined your offer on this plan; it can't be offered again.`);
    } else {
      return cur;
    }
  } else {
    await setDoc(ref, {
      contractId: c.id,
      contractTitle: c.title.slice(0, 120),
      smeUid: c.smeUid,
      funderUid: uid,
      funderName: funderName.trim().slice(0, 120),
      note: note.trim().slice(0, 300),
      status: 'offered',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      respondedAt: null,
    });
  }
  const snap = await getDoc(ref);
  return mapFunding(id, snap.data() || {});
}

/** Funder: withdraw an offer the business has not answered yet. */
export async function withdrawFunding(f: Funding): Promise<void> {
  await updateDoc(doc(col(), f.id), { status: 'withdrawn', updatedAt: serverTimestamp() });
}

/** SME: accept or decline a funder's offer on one of its agreements. */
export async function respondToFunding(f: Funding, decision: 'accepted' | 'declined'): Promise<void> {
  await updateDoc(doc(col(), f.id), { status: decision, updatedAt: serverTimestamp(), respondedAt: serverTimestamp() });
}

/** Funder: every funding I have created (any status). */
export async function fetchMyFundings(): Promise<Funding[]> {
  const { uid } = requireUser();
  const snap = await getDocs(query(col(), where('funderUid', '==', uid)));
  return snap.docs.map((d) => mapFunding(d.id, d.data())).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** SME: every funding on my agreements (any status). */
export async function fetchFundingsForMyAgreements(): Promise<Funding[]> {
  const { uid } = requireUser();
  const snap = await getDocs(query(col(), where('smeUid', '==', uid)));
  return snap.docs.map((d) => mapFunding(d.id, d.data())).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

/** A plan the funder can (re)select: live, and not currently offered/accepted/declined by them. */
export const canOffer = (f: Funding | undefined) => !f || f.status === 'withdrawn';

/** A funder's "live" relationship with a plan — offered or accepted. */
export const isLiveFunding = (f: Funding) => f.status === 'offered' || f.status === 'accepted';
