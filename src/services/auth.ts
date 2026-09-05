import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

const toAuthUser = (u: User): AuthUser => ({
  uid: u.uid,
  email: u.email,
  displayName: u.displayName,
  emailVerified: u.emailVerified,
});

/** Passwords must be at least this long (Firebase's own floor is 6). */
export const MIN_PASSWORD_LENGTH = 8;

// Business name captured at signup. onAuthStateChanged fires before
// updateProfile() lands, so the seeder reads the name from here instead of
// relying on user.displayName being populated in time.
let pendingBusinessName: string | null = null;

/** One-shot read of the business name entered on the signup form. */
export function takePendingBusinessName(): string | null {
  const name = pendingBusinessName;
  pendingBusinessName = null;
  return name;
}

/** Subscribe to auth state. Returns unsubscribe. */
export function subscribeToAuth(cb: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, (u) => cb(u ? toAuthUser(u) : null));
}

export async function signUp(email: string, password: string, businessName: string): Promise<AuthUser> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw { code: 'auth/weak-password' };
  }
  pendingBusinessName = businessName.trim() || null;
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  if (businessName.trim()) {
    await updateProfile(cred.user, { displayName: businessName.trim() });
  }
  // Fire-and-forget: a failed email send must not block account creation.
  sendEmailVerification(cred.user).catch(() => undefined);
  return toAuthUser(cred.user);
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return toAuthUser(cred.user);
}

// NOTE: the former "Sign in with PayShap" flow derived a password from a
// phone number, which would have let anyone who knew a merchant's number
// take over their account. PayShap is a payment rail, not an identity
// provider, so it has been removed from authentication and is used only
// as a payment method on contracts.

/** Re-send the verification email for the signed-in user. */
export async function sendVerificationEmail(): Promise<void> {
  if (auth.currentUser && !auth.currentUser.emailVerified) {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/** Map Firebase auth error codes to friendly messages. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.';
    case 'auth/weak-password':
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error — check your connection and try again.';
    default:
      return (err as Error)?.message || 'Something went wrong. Please try again.';
  }
}
