import { create } from 'zustand';
import type { AccountType, BusinessDocument, ContractView, Funding, PublicProfile, Verification } from '../types';
import type { AuthUser } from '../services/auth';
import * as profileSvc from '../services/profile';
import * as contractSvc from '../services/contracts';
import * as fundingSvc from '../services/funding';
import { AccentThemeKey, getStoredAccentTheme, storeAccentTheme } from '../theme/accents';

type ToastType = 'success' | 'warning' | 'error' | 'info';

/** Account type chosen on the sign-up form, applied when the profile is first created. */
let pendingAccountType: AccountType | null = null;
export const setPendingAccountType = (t: AccountType | null) => {
  pendingAccountType = t;
};

interface AppState {
  // Auth
  user: AuthUser | null;
  authReady: boolean;
  setAuthUser: (user: AuthUser | null) => void;

  // Identity
  profile: PublicProfile | null;
  verification: Verification | null;
  identityReady: boolean;
  loadIdentity: () => Promise<void>;
  chooseAccountType: (t: AccountType) => Promise<void>;
  /** Reload everything the current account type works with. */
  refreshWorkspace: () => Promise<void>;

  // Contracts (participant view)
  contracts: ContractView[];
  contractsLoading: boolean;
  contractsError: string | null;
  loadContracts: () => Promise<void>;

  // Business documents (Run)
  documents: BusinessDocument[];
  loadDocuments: () => Promise<void>;

  // Directory (Connect + funder SME list)
  businesses: PublicProfile[];
  loadBusinesses: () => Promise<void>;

  // Funder: live agreements of businesses that are open to funding
  opportunities: ContractView[];
  loadOpportunities: () => Promise<void>;

  // Fundings — funder: mine; business: offers on my agreements
  fundings: Funding[];
  loadFundings: () => Promise<void>;
  /** Business-level "looking for funding" switch. */
  setSeekingFunding: (seeking: boolean) => Promise<void>;

  // Navigation
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  toggleMobileNav: () => void;
  setMobileNavOpen: (open: boolean) => void;

  // Appearance
  darkMode: boolean;
  toggleDarkMode: () => void;
  accentTheme: AccentThemeKey;
  setAccentTheme: (key: AccentThemeKey) => void;

  // Transient toasts
  toasts: { id: string; message: string; type: ToastType }[];
  showToast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const storedDark = () => {
  try {
    return localStorage.getItem('plexus-dark') === '1';
  } catch {
    return false;
  }
};

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  authReady: false,
  setAuthUser: (user) => {
    set({ user, authReady: true });
    if (user) {
      get()
        .loadIdentity()
        .then(() => get().refreshWorkspace());
    } else {
      set({
        profile: null,
        verification: null,
        identityReady: false,
        contracts: [],
        contractsError: null,
        documents: [],
        businesses: [],
        opportunities: [],
        fundings: [],
      });
    }
  },

  // Identity
  profile: null,
  verification: null,
  identityReady: false,
  loadIdentity: async () => {
    try {
      const [profile, verification] = await Promise.all([
        profileSvc.ensureProfile(pendingAccountType),
        profileSvc.fetchVerification(),
      ]);
      pendingAccountType = null;
      set({ profile, verification, identityReady: true });
    } catch (err: any) {
      console.warn('Identity load failed:', err?.message);
      set({ identityReady: true });
    }
  },
  chooseAccountType: async (t) => {
    const profile = await profileSvc.setAccountType(t);
    set({ profile });
    await get().refreshWorkspace();
  },
  refreshWorkspace: async () => {
    const type = get().profile?.accountType;
    if (type === 'business') {
      await Promise.all([get().loadContracts(), get().loadDocuments(), get().loadFundings()]);
    } else if (type === 'funder') {
      // Opportunities depend on which businesses are open to funding.
      await get().loadBusinesses();
      await Promise.all([get().loadOpportunities(), get().loadFundings()]);
    }
  },

  // Contracts
  contracts: [],
  contractsLoading: false,
  contractsError: null,
  loadContracts: async () => {
    set({ contractsLoading: true });
    try {
      const contracts = await contractSvc.fetchMyContracts();
      set({ contracts, contractsLoading: false, contractsError: null });
    } catch (err: any) {
      set({ contractsLoading: false, contractsError: err?.message || 'Could not load agreements' });
    }
  },

  // Documents
  documents: [],
  loadDocuments: async () => {
    try {
      set({ documents: await profileSvc.fetchDocuments() });
    } catch (err: any) {
      console.warn('Documents load failed:', err?.message);
    }
  },

  // Directory
  businesses: [],
  loadBusinesses: async () => {
    try {
      set({ businesses: await profileSvc.fetchBusinessProfiles() });
    } catch (err: any) {
      console.warn('Directory load failed:', err?.message);
    }
  },

  // Funder opportunities — live agreements of businesses open to funding.
  opportunities: [],
  loadOpportunities: async () => {
    try {
      let businesses = get().businesses;
      if (businesses.length === 0) {
        businesses = await profileSvc.fetchBusinessProfiles();
        set({ businesses });
      }
      const seeking = businesses.filter((b) => b.seekingFunding).map((b) => b.uid);
      set({ opportunities: await contractSvc.fetchFundingOpportunities(seeking) });
    } catch (err: any) {
      // Expected until the funder has submitted verification (rules deny the queries).
      set({ opportunities: [] });
    }
  },

  // Fundings
  fundings: [],
  loadFundings: async () => {
    const type = get().profile?.accountType;
    try {
      if (type === 'funder') set({ fundings: await fundingSvc.fetchMyFundings() });
      else if (type === 'business') set({ fundings: await fundingSvc.fetchFundingsForMyAgreements() });
    } catch (err: any) {
      console.warn('Fundings load failed:', err?.message);
    }
  },
  setSeekingFunding: async (seeking) => {
    const profile = await profileSvc.setSeekingFunding(seeking);
    set({ profile });
  },

  // Navigation
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  mobileNavOpen: false,
  toggleMobileNav: () => set((s) => ({ mobileNavOpen: !s.mobileNavOpen })),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),

  // Appearance
  darkMode: storedDark(),
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      try {
        localStorage.setItem('plexus-dark', next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return { darkMode: next };
    }),
  accentTheme: getStoredAccentTheme(),
  setAccentTheme: (key) => {
    storeAccentTheme(key);
    set({ accentTheme: key });
  },

  // Toasts
  toasts: [],
  showToast: (message, type = 'info') => {
    const id = crypto.randomUUID();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
