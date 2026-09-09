/**
 * Public demo accounts — the same credentials documented in README.md.
 *
 * The in-app switcher renders only when the signed-in user IS one of these
 * accounts and can only sign into another one of them, so it cannot be used to
 * reach any real account. Firestore rules remain the security boundary no
 * matter which of these is signed in.
 */
export type DemoKey = 'sme' | 'buyer' | 'funder';

export interface DemoAccount {
  key: DemoKey;
  role: 'Business' | 'Buyer' | 'Funder';
  business: string;
  email: string;
  password: string;
}

export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { key: 'sme', role: 'Business', business: 'Ubuntu Textiles', email: 'demo@plexus.co.za', password: 'demo1234' },
  { key: 'buyer', role: 'Buyer', business: 'Example Retail (Pty) Ltd', email: 'buyer.plexus.test@example.com', password: 'buyerpass123' },
  { key: 'funder', role: 'Funder', business: 'Vuka Capital', email: 'funder.plexus.test@example.com', password: 'funderpass123' },
];

export const demoAccountFor = (email: string | null | undefined): DemoAccount | undefined =>
  email ? DEMO_ACCOUNTS.find((a) => a.email === email.trim().toLowerCase()) : undefined;

/** Accounts offered in the Settings switcher — the two sides of a deal only; the buyer is recognised but not a target. */
export const DEMO_SWITCH_TARGETS: readonly DemoAccount[] = DEMO_ACCOUNTS.filter((a) => a.key !== 'buyer');

/** One-click jump target: either business-side demo ↔ the funder demo. */
export const pairedDemoAccount = (current: DemoAccount): DemoAccount =>
  current.key === 'funder' ? DEMO_ACCOUNTS[0] : DEMO_ACCOUNTS[2];
