import { create } from 'zustand';
import type { AccountType, BusinessDocument, ContractView, PublicProfile, Verification } from '../types';
import type { AuthUser } from '../services/auth';
import * as profileSvc from '../services/profile';
import * as contractSvc from '../services/contracts';
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

  // Funder: listed payment plans
  opportunities: ContractView[];
  loadOpportunities: () => Promise<void>;

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
      await Promise.all([get().loadContracts(), get().loadDocuments()]);
    } else if (type === 'funder') {
      await Promise.all([get().loadBusinesses(), get().loadOpportunities()]);
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

  // Funder opportunities
  opportunities: [],
  loadOpportunities: async () => {
    try {
      set({ opportunities: await contractSvc.fetchFundingOpportunities() });
    } catch (err: any) {
      // Expected until the funder has submitted verification (rules deny the query).
      set({ opportunities: [] });
    }
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
