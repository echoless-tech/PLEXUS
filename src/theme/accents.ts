// ─── Accent theme palettes ───────────────────────────────────────────
// Each theme only swaps the accent + soft tints. The warm cream / charcoal
// surfaces stay intact, so the design language is preserved across themes.

export type AccentThemeKey = 'clay' | 'pine' | 'indigo' | 'teal' | 'plum';

export interface AccentPalette {
  accent: string;
  accentContrast: string;
  accentSoft: string;
  accentSoftStrong: string;
}

export interface AccentTheme {
  key: AccentThemeKey;
  label: string;
  description: string;
  light: AccentPalette;
  dark: AccentPalette;
}

export const ACCENT_THEMES: Record<AccentThemeKey, AccentTheme> = {
  clay: {
    key: 'clay',
    label: 'Clay',
    description: 'Warm burnt terracotta — the original PLEXUS accent.',
    light: {
      accent: '#bb5a3c',
      accentContrast: '#fbf8f1',
      accentSoft: 'rgba(187, 90, 60, 0.10)',
      accentSoftStrong: 'rgba(187, 90, 60, 0.16)',
    },
    dark: {
      accent: '#cf7050',
      accentContrast: '#15110e',
      accentSoft: 'rgba(207, 112, 80, 0.12)',
      accentSoftStrong: 'rgba(207, 112, 80, 0.20)',
    },
  },
  pine: {
    key: 'pine',
    label: 'Pine',
    description: 'Calm sage green with a growth / money feel.',
    light: {
      accent: '#2f6b4f',
      accentContrast: '#f6f1e8',
      accentSoft: 'rgba(47, 107, 79, 0.10)',
      accentSoftStrong: 'rgba(47, 107, 79, 0.16)',
    },
    dark: {
      accent: '#5aa17e',
      accentContrast: '#0d1410',
      accentSoft: 'rgba(90, 161, 126, 0.14)',
      accentSoftStrong: 'rgba(90, 161, 126, 0.20)',
    },
  },
  indigo: {
    key: 'indigo',
    label: 'Indigo',
    description: 'Classic fintech indigo — professional and trustworthy.',
    light: {
      accent: '#4453c4',
      accentContrast: '#f6f1e8',
      accentSoft: 'rgba(68, 83, 196, 0.10)',
      accentSoftStrong: 'rgba(68, 83, 196, 0.16)',
    },
    dark: {
      accent: '#8b95f0',
      accentContrast: '#0c0d1a',
      accentSoft: 'rgba(139, 149, 240, 0.14)',
      accentSoftStrong: 'rgba(139, 149, 240, 0.20)',
    },
  },
  teal: {
    key: 'teal',
    label: 'Teal',
    description: 'Fresh deep teal — modern and great for data.',
    light: {
      accent: '#117a73',
      accentContrast: '#f6f1e8',
      accentSoft: 'rgba(17, 122, 115, 0.10)',
      accentSoftStrong: 'rgba(17, 122, 115, 0.16)',
    },
    dark: {
      accent: '#3fb6ab',
      accentContrast: '#06110f',
      accentSoft: 'rgba(63, 182, 171, 0.14)',
      accentSoftStrong: 'rgba(63, 182, 171, 0.20)',
    },
  },
  plum: {
    key: 'plum',
    label: 'Plum',
    description: 'Premium aubergine — distinctive and refined.',
    light: {
      accent: '#7a3f73',
      accentContrast: '#f6f1e8',
      accentSoft: 'rgba(122, 63, 115, 0.10)',
      accentSoftStrong: 'rgba(122, 63, 115, 0.16)',
    },
    dark: {
      accent: '#bd84b4',
      accentContrast: '#150c14',
      accentSoft: 'rgba(189, 132, 180, 0.14)',
      accentSoftStrong: 'rgba(189, 132, 180, 0.20)',
    },
  },
};

export const ACCENT_THEME_LIST: AccentTheme[] = Object.values(ACCENT_THEMES);

const STORAGE_KEY = 'plexus-accent-theme';

export const getStoredAccentTheme = (): AccentThemeKey => {
  if (typeof localStorage === 'undefined') return 'clay';
  const stored = localStorage.getItem(STORAGE_KEY) as AccentThemeKey | null;
  return stored && stored in ACCENT_THEMES ? stored : 'clay';
};

export const storeAccentTheme = (key: AccentThemeKey): void => {
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, key);
};

/** Write the active accent palette onto the document root as CSS variables. */
export const applyAccentTheme = (key: AccentThemeKey, mode: 'light' | 'dark'): void => {
  const palette = (ACCENT_THEMES[key] ?? ACCENT_THEMES.clay)[mode];
  const root = document.documentElement;
  root.style.setProperty('--accent', palette.accent);
  root.style.setProperty('--accent-contrast', palette.accentContrast);
  root.style.setProperty('--accent-soft', palette.accentSoft);
  root.style.setProperty('--accent-soft-strong', palette.accentSoftStrong);
};
