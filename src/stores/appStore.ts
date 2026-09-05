import { create } from 'zustand';
import type { ContractView, PublicProfile, Verification } from '../types';
import type { AuthUser } from '../services/auth';
import * as profileSvc from '../services/profile';
import * as contractSvc from '../services/contracts';
import { AccentThemeKey, getStoredAccentTheme, storeAccentTheme } from '../theme/accents';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface AppState {
  // Auth
  user: AuthUser | null;
  authReady: boolean;
  setAuthUser: (user: AuthUser | null) => void;

  // Identity
  profile: PublicProfile | null;
  verification: Verification | null;
  loadIdentity: () => Promise<void>;

  // Contracts
  contracts: ContractView[];
  contractsLoading: boolean;
  contractsError: string | null;
  loadContracts: () => Promise<void>;

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
      get().loadIdentity().then(() => get().loadContracts());
    } else {
      set({ profile: null, verification: null, contracts: [], contractsError: null });
    }
  },

  // Identity
  profile: null,
  verification: null,
  loadIdentity: async () => {
    try {
      const [profile, verification] = await Promise.all([
        profileSvc.ensureProfile(),
        profileSvc.fetchVerification(),
      ]);
      set({ profile, verification });
    } catch (err: any) {
      console.warn('Identity load failed:', err?.message);
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
