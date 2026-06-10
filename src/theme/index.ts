import { createTheme, alpha } from '@mui/material/styles';

// NODAL Brand Colors — warm humanist palette aligned with the Tailwind tokens
const brandColors = {
  primary: {
    main: '#211d17',      // warm ink
    light: '#3a342b',
    dark: '#15110e',
    contrastText: '#fbf8f1',
  },
  secondary: {
    main: '#877e6f',      // taupe
    light: '#b3a995',
    dark: '#5b574f',
    contrastText: '#fbf8f1',
  },
  accent: {
    orange: '#f97316',
    purple: '#8b5cf6',
    gold: '#f59e0b',
    pink: '#ec4899',
    cyan: '#06b6d4',
  },
  status: {
    success: '#16a34a',
    warning: '#d97706',
    error: '#dc2626',
    info: '#2563eb',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
};

// ─── AI / ACCENT COLOR — single muted terracotta, used for critical callouts ─
export const AI = {
  main: '#bb5a3c',
  dark: '#9c4a30',
  light: '#cf7050',
  gradient: '#bb5a3c',
  glow: 'none',
  bg06: 'rgba(187, 90, 60, 0.06)',
  bg08: 'rgba(187, 90, 60, 0.08)',
  bg10: 'rgba(187, 90, 60, 0.1)',
  bg12: 'rgba(187, 90, 60, 0.12)',
  bg15: 'rgba(187, 90, 60, 0.15)',
  bg20: 'rgba(187, 90, 60, 0.2)',
  bg30: 'rgba(187, 90, 60, 0.3)',
};

export const getTheme = (mode: 'light' | 'dark') => createTheme({
  palette: {
    mode,
    primary: brandColors.primary,
    secondary: brandColors.secondary,
    success: { main: brandColors.status.success },
    warning: { main: brandColors.status.warning },
    error: { main: brandColors.status.error },
    info: { main: brandColors.status.info },
    background: {
      default: mode === 'light' ? '#ece5d8' : '#0c0c0e',
      paper: mode === 'light' ? '#f6f1e8' : '#161618',
    },
    text: {
      primary: mode === 'light' ? '#211d17' : '#f1ede6',
      secondary: mode === 'light' ? '#877e6f' : '#8d877d',
    },
    divider: mode === 'light' ? 'rgba(33,29,23,0.07)' : 'rgba(255,255,255,0.07)',
  },
  typography: {
    fontFamily: '"Hanken Grotesk Variable", "Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 14,
  },
  shadows: [
    'none','none','none','none','none','none','none','none','none','none',
    'none','none','none','none','none','none','none','none','none','none',
    'none','none','none','none','none',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.18)' : 'rgba(255,255,255,0.16)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          padding: '9px 18px',
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'none',
          boxShadow: 'none',
        },
        contained: {
          backgroundColor: brandColors.primary.main,
          '&:hover': {
            backgroundColor: brandColors.primary.dark,
            boxShadow: 'none',
          },
        },
        containedSecondary: {
          backgroundColor: brandColors.secondary.main,
          '&:hover': {
            backgroundColor: brandColors.secondary.dark,
            boxShadow: 'none',
          },
        },
        outlined: {
          borderWidth: '1px',
          borderColor: mode === 'light' ? 'rgba(33,29,23,0.12)' : 'rgba(255,255,255,0.14)',
          color: mode === 'light' ? '#211d17' : '#f1ede6',
          '&:hover': {
            borderWidth: '1px',
            borderColor: mode === 'light' ? 'rgba(33,29,23,0.2)' : 'rgba(255,255,255,0.24)',
            backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.04)' : 'rgba(255,255,255,0.05)',
          },
        },
        text: {
          color: mode === 'light' ? '#211d17' : '#f1ede6',
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.04)' : 'rgba(255,255,255,0.05)',
          },
        },
      },
      defaultProps: {
        disableElevation: true,
        disableRipple: false,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: 'none',
          border: 'none',
          background: mode === 'light' ? '#f6f1e8' : '#161618',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: 'none',
        },
        rounded: {
          borderRadius: 18,
        },
        outlined: {
          border: `1px solid ${mode === 'light' ? 'rgba(33,29,23,0.09)' : 'rgba(255,255,255,0.09)'}`,
        },
        elevation1: {
          boxShadow: 'none',
          border: 'none',
        },
        elevation2: {
          boxShadow: 'none',
          border: 'none',
        },
        elevation3: {
          boxShadow: 'none',
          border: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
        filled: {
          '&.MuiChip-colorSuccess': {
            backgroundColor: brandColors.status.success,
            color: '#fff',
          },
          '&.MuiChip-colorWarning': {
            backgroundColor: brandColors.status.warning,
            color: '#fff',
          },
          '&.MuiChip-colorError': {
            backgroundColor: brandColors.status.error,
            color: '#fff',
          },
          '&.MuiChip-colorPrimary': {
            backgroundColor: brandColors.primary.main,
            color: '#fff',
          },
          '&.MuiChip-colorSecondary': {
            backgroundColor: brandColors.secondary.main,
            color: '#fff',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.05)' : 'rgba(255,255,255,0.05)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'transparent',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'light' ? 'rgba(33,29,23,0.12)' : 'rgba(255,255,255,0.14)',
          },
          '&.Mui-focused': {
            backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.03)' : 'rgba(255,255,255,0.04)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--accent)',
              borderWidth: 1,
            },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          '&.Mui-focused': {
            color: 'var(--accent)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: 'transparent',
          color: mode === 'light' ? '#877e6f' : '#8d877d',
          borderBottom: `1px solid ${mode === 'light' ? 'rgba(33,29,23,0.09)' : 'rgba(255,255,255,0.09)'}`,
        },
        root: {
          borderBottom: `1px solid ${mode === 'light' ? 'rgba(33,29,23,0.07)' : 'rgba(255,255,255,0.07)'}`,
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.03)' : 'rgba(255,255,255,0.04)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: mode === 'light'
            ? '0 24px 60px -20px rgba(33,29,23,0.25)'
            : '0 24px 60px -20px rgba(0,0,0,0.6)',
          border: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: mode === 'light'
            ? '-24px 0 60px -30px rgba(33,29,23,0.25)'
            : '-24px 0 60px -30px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          marginBottom: 2,
          '&.Mui-selected': {
            backgroundColor: alpha(brandColors.primary.main, 0.08),
            '&:hover': {
              backgroundColor: alpha(brandColors.primary.main, 0.12),
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: '60%',
              borderRadius: '0 2px 2px 0',
              backgroundColor: brandColors.primary.main,
            },
          },
          '&:hover': {
            backgroundColor: alpha(brandColors.primary.main, 0.04),
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
        },
        colorDefault: {
          backgroundColor: brandColors.primary.main,
          color: '#fff',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#211d17',
          color: '#fbf8f1',
          borderRadius: 8,
          fontSize: '0.8rem',
          fontWeight: 500,
          padding: '6px 12px',
        },
        arrow: {
          color: '#211d17',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          height: 6,
          backgroundColor: mode === 'light' ? 'rgba(33,29,23,0.08)' : 'rgba(255,255,255,0.08)',
        },
        bar: {
          borderRadius: 2,
          backgroundColor: brandColors.primary.main,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          backgroundColor: brandColors.primary.main,
          boxShadow: 'none',
          borderRadius: 16,
          '&:hover': {
            backgroundColor: brandColors.primary.dark,
            boxShadow: 'none',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          borderRadius: 0,
          backgroundColor: brandColors.primary.main,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          '&.Mui-selected': {
            color: brandColors.primary.main,
          },
        },
      },
    },
  },
});

export const theme = getTheme('light');
export default theme;
