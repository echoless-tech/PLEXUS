import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { takePendingBusinessName } from './auth';
import type {
  AccountType,
  BusinessDocument,
  DocumentKind,
  Industry,
  PublicProfile,
  Verification,
  VerificationStatus,
} from '../types';
import { LIMITS } from '../types';

function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not signed in');
  return uid;
}

const toDate = (v: unknown): Date =>
  v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date();

function mapProfile(uid: string, d: Record<string, any>): PublicProfile {
  return {
    uid,
    accountType: d.accountType ?? null,
    businessName: d.businessName,
    verificationStatus: d.verificationStatus,
    logoDataUrl: d.logoDataUrl ?? null,
    industry: d.industry ?? null,
    description: d.description ?? '',
    location: d.location ?? '',
    publicEmail: d.publicEmail ?? '',
    createdAt: toDate(d.createdAt),
    seekingFunding: d.seekingFunding === true,
    ratingScore: typeof d.ratingScore === 'number' ? d.ratingScore : null,
    ratingCount: typeof d.ratingCount === 'number' ? d.ratingCount : 0,
  };
}

/**
 * Full document body — rules use hasAll, so every key is always written.
 * The server-owned rating snapshot is carried through untouched (the rules
 * reject any change to it) so a settings save never erases it.
 */
function profileDoc(p: PublicProfile, createdAt: unknown) {
  return {
    uid: p.uid,
    accountType: p.accountType,
    businessName: p.businessName.trim().slice(0, LIMITS.name),
    verificationStatus: p.verificationStatus,
    logoDataUrl: p.logoDataUrl,
    industry: p.industry,
    description: p.description.trim().slice(0, 600),
    location: p.location.trim().slice(0, 120),
    publicEmail: p.publicEmail.trim().toLowerCase().slice(0, LIMITS.email),
    createdAt,
    seekingFunding: p.accountType === 'business' && p.seekingFunding === true,
    ...(p.ratingScore != null ? { ratingScore: p.ratingScore, ratingCount: p.ratingCount ?? 0 } : {}),
  };
}

// ─── Public profile ──────────────────────────────────────────────────

/**
 * Loads the caller's profile, creating a blank one on first sign-in.
 * accountType starts null; the app forces a choice before anything else.
 * Older profiles (pre-restructure) are upgraded in place with the new fields.
 */
export async function ensureProfile(pendingType: AccountType | null = null): Promise<PublicProfile> {
  const uid = requireUid();
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const d = snap.data();
    const needsUpgrade =
      !('accountType' in d) || !('logoDataUrl' in d) || !('publicEmail' in d) || !('seekingFunding' in d);
    const profile = mapProfile(uid, d);
    if (needsUpgrade) {
      await setDoc(ref, profileDoc(profile, d.createdAt));
    }
    return profile;
  }

  const businessName =
    takePendingBusinessName() || auth.currentUser?.displayName || 'My business';
  const fresh: PublicProfile = {
    uid,
    accountType: pendingType,
    businessName,
    verificationStatus: 'unverified',
    logoDataUrl: null,
    industry: null,
    description: '',
    location: '',
    publicEmail: auth.currentUser?.email?.toLowerCase() || '',
    createdAt: new Date(),
    seekingFunding: false,
  };
  await setDoc(ref, profileDoc(fresh, serverTimestamp()));
  return fresh;
}

export async function fetchProfile(uid: string): Promise<PublicProfile | null> {
  const snap = await getDoc(doc(db, 'profiles', uid));
  return snap.exists() ? mapProfile(uid, snap.data()) : null;
}

async function rewriteOwnProfile(patch: Partial<PublicProfile>): Promise<PublicProfile> {
  const uid = requireUid();
  const ref = doc(db, 'profiles', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Profile missing');
  const current = mapProfile(uid, snap.data());
  const next: PublicProfile = { ...current, ...patch, uid };
  await setDoc(ref, profileDoc(next, snap.data().createdAt));
  return next;
}

/** Write-once: the rules reject any later change. */
export async function setAccountType(type: AccountType): Promise<PublicProfile> {
  return rewriteOwnProfile({ accountType: type });
}

export interface ProfileDetailsInput {
  businessName: string;
  industry: Industry | null;
  description: string;
  location: string;
  publicEmail: string;
  logoDataUrl: string | null;
}

export async function updateProfileDetails(input: ProfileDetailsInput): Promise<PublicProfile> {
  if (input.logoDataUrl && input.logoDataUrl.length > LIMITS.logoDataUrl)
    throw new Error('Logo is too large — use an image under ~150 KB.');
  return rewriteOwnProfile({
    businessName: input.businessName,
    industry: input.industry,
    description: input.description,
    location: input.location,
    publicEmail: input.publicEmail,
    logoDataUrl: input.logoDataUrl,
  });
}

/** Every business profile on the platform (Connect + Funder directory). */
export async function fetchBusinessProfiles(): Promise<PublicProfile[]> {
  const snap = await getDocs(query(collection(db, 'profiles'), where('accountType', '==', 'business')));
  return snap.docs
    .map((d) => mapProfile(d.id, d.data()))
    .sort((a, b) => a.businessName.localeCompare(b.businessName));
}

/**
 * Business-level switch: while true, verified funders can browse this
 * business's live agreements and choose which plans to fund. Turning it off
 * hides the agreements from funders again (existing fundings are unaffected).
 */
export async function setSeekingFunding(seeking: boolean): Promise<PublicProfile> {
  return rewriteOwnProfile({ seekingFunding: seeking });
}

// ─── Private verification (KYC summary) ──────────────────────────────

export type VerificationInput = Omit<Verification, 'status' | 'submittedAt' | 'updatedAt'>;

export async function fetchVerification(): Promise<Verification | null> {
  const uid = requireUid();
  const snap = await getDoc(doc(db, 'verifications', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    ...(d as Omit<Verification, 'submittedAt' | 'updatedAt' | 'licenceNumber'>),
    licenceNumber: d.licenceNumber ?? '',
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
    licenceNumber: input.licenceNumber.trim().slice(0, 64),
    status,
    submittedAt: keepVerified && existing.data().submittedAt ? existing.data().submittedAt : serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Mirror the (non-sensitive) status + display name onto the public profile.
  await rewriteOwnProfile({
    verificationStatus: status,
    businessName: input.tradingName.trim() || input.legalName.trim() || undefined,
  } as Partial<PublicProfile>);
}

// ─── Business documents (Run) ────────────────────────────────────────

export interface DocumentInput {
  kind: DocumentKind;
  title: string;
  documentDate: string;
  amount: number | null;
  counterparty: string;
  note: string;
  fileName: string | null;
  mimeType: string | null;
  dataUrl: string | null;
}

const docsCol = () => collection(db, 'profiles', requireUid(), 'documents');

export async function fetchDocuments(): Promise<BusinessDocument[]> {
  const snap = await getDocs(query(docsCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => {
    const x = d.data();
    return {
      id: d.id,
      kind: x.kind,
      title: x.title,
      documentDate: x.documentDate,
      amount: x.amount ?? null,
      counterparty: x.counterparty ?? '',
      note: x.note ?? '',
      fileName: x.fileName ?? null,
      mimeType: x.mimeType ?? null,
      dataUrl: x.dataUrl ?? null,
      analysisStatus: x.analysisStatus,
      analysisNote: x.analysisNote ?? null,
      createdAt: toDate(x.createdAt),
    };
  });
}

export async function addDocument(input: DocumentInput): Promise<string> {
  if (!input.title.trim()) throw new Error('Give the document a title.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.documentDate)) throw new Error('Choose the document date.');
  if (input.dataUrl && input.dataUrl.length > LIMITS.documentDataUrl)
    throw new Error('File is too large — keep documents under ~500 KB.');
  const ref = doc(docsCol());
  await setDoc(ref, {
    kind: input.kind,
    title: input.title.trim().slice(0, 160),
    documentDate: input.documentDate,
    amount: input.amount === null || Number.isNaN(input.amount) ? null : Math.round(input.amount * 100) / 100,
    counterparty: input.counterparty.trim().slice(0, 160),
    note: input.note.trim().slice(0, 1000),
    fileName: input.fileName ? input.fileName.slice(0, LIMITS.fileName) : null,
    mimeType: input.mimeType ? input.mimeType.slice(0, 64) : null,
    dataUrl: input.dataUrl,
    // Reserved for the server-side AI analysis (implemented later).
    analysisStatus: 'pending_review',
    analysisNote: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function removeDocument(id: string): Promise<void> {
  await deleteDoc(doc(docsCol(), id));
}
