import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { takePendingBusinessName } from './auth';
import type { PublicProfile, Verification, VerificationStatus } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

const toDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();

// ─── Public profile ──────────────────────────────────────────────────

export async function ensureProfile(): Promise<PublicProfile> {
  const uid = requireUid();
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const d = snap.data();
    return {
      uid,
      businessName: d.businessName,
      verificationStatus: d.verificationStatus,
      createdAt: toDate(d.createdAt),
    };
  }
  const businessName =
    takePendingBusinessName() || auth.currentUser?.displayName || 'My business';
  await setDoc(ref, {
    uid,
    businessName,
    verificationStatus: 'unverified' satisfies VerificationStatus,
    createdAt: serverTimestamp(),
  });
  return { uid, businessName, verificationStatus: 'unverified', createdAt: new Date() };
}

export async function fetchProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    uid,
    businessName: d.businessName,
    verificationStatus: d.verificationStatus,
    createdAt: toDate(d.createdAt),
  };
}

export async function updateBusinessName(name: string): Promise<void> {
  const uid = requireUid();
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Profile missing');
  const d = snap.data();
  await setDoc(ref, {
    uid,
    businessName: name.trim().slice(0, 120),
    verificationStatus: d.verificationStatus,
    createdAt: d.createdAt,
  });
}

// ─── Private verification (KYC summary) ──────────────────────────────

export type VerificationInput = Omit<Verification, 'status' | 'submittedAt' | 'updatedAt'>;

export async function fetchVerification(): Promise<Verification | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'verifications', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...(d as Omit<Verification, 'submittedAt' | 'updatedAt'>),
    submittedAt: d.submittedAt ? toDate(d.submittedAt) : null,
    updatedAt: toDate(d.updatedAt),
  };
}

/**
 * Submits the verification summary and marks the account 'pending'.
 * Only the last four digits of identity and bank numbers are ever stored —
 * the rules reject anything else. Moving to 'verified' is server-side only.
 */
export async function submitVerification(input: VerificationInput): Promise<void> {
  const uid = requireUid();
  const existing = await getDoc(doc(db, 'verifications', uid));
  const keepVerified = existing.exists() && existing.data().status === 'verified';
  const status: VerificationStatus = keepVerified ? 'verified' : 'pending';

  await setDoc(doc(db, 'verifications', uid), {
    legalName: input.legalName.trim().slice(0, 160),
    tradingName: input.tradingName.trim().slice(0, 160),
    registrationNumber: input.registrationNumber.trim().slice(0, 40),
    taxNumber: input.taxNumber.trim().slice(0, 40),
    ownerFullName: input.ownerFullName.trim().slice(0, 160),
    ownerIdLast4: input.ownerIdLast4.replace(/\D/g, '').slice(-4),
    phone: input.phone.trim().slice(0, 32),
    email: input.email.trim().toLowerCase().slice(0, 254),
    address: input.address.trim().slice(0, 300),
    bankName: input.bankName.trim().slice(0, 64),
    accountHolder: input.accountHolder.trim().slice(0, 120),
    accountNumberLast4: input.accountNumberLast4.replace(/\D/g, '').slice(-4),
    status,
    submittedAt: keepVerified && existing.data().submittedAt ? existing.data().submittedAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Mirror the (non-sensitive) status onto the public profile.
  const profRef = doc(db, 'profiles', uid);
  const prof = await getDoc(profRef);
  if (prof.exists()) {
    const p = prof.data();
    await setDoc(profRef, {
      uid,
      businessName: input.tradingName.trim() || input.legalName.trim() || p.businessName,
      verificationStatus: status,
      createdAt: p.createdAt,
    });
  }
}
