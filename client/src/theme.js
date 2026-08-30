import { createTheme } from '@mui/material/styles';

// Minimal Professional Theme — Slate / Indigo
const minimalProTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#4F46E5',       // Indigo-600
      light: '#818CF8',      // Indigo-400
      dark: '#3730A3',       // Indigo-800
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#64748B',       // Slate-500
      light: '#94A3B8',      // Slate-400
      dark: '#334155',       // Slate-700
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981',       // Emerald-500
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',       // Amber-500
      light: '#FCD34D',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',       // Red-500
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6',       // Blue-500
      light: '#93C5FD',
      dark: '#1D4ED8',
    },
    background: {
      default: '#F8FAFC',    // Slate-50
      paper: '#FFFFFF',
    },
    text: {
      primary: '#0F172A',    // Slate-900
      secondary: '#64748B',  // Slate-500
    },
    divider: '#E2E8F0',      // Slate-200
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.025em' },
    h2: { fontWeight: 700, letterSpacing: '-0.025em' },
    h3: { fontWeight: 600, letterSpacing: '-0.015em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { fontWeight: 500, letterSpacing: '0.01em' },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgba(0,0,0,0.05)',
    '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
    '0 10px 15px -3px rgba(0,0,0,0.07), 0 4px 6px -4px rgba(0,0,0,0.05)',
    '0 20px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.04)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { -webkit-font-smoothing: antialiased; }
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 18px',
          fontWeight: 500,
          fontSize: '0.875rem',
          transition: 'all 0.15s ease',
        },
        contained: {
          boxShadow: '0 1px 2px 0 rgba(79,70,229,0.2)',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(79,70,229,0.25)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        outlined: {
          borderColor: '#E2E8F0',
          '&:hover': { borderColor: '#4F46E5', backgroundColor: '#F5F3FF' },
        },
        text: {
          '&:hover': { backgroundColor: '#F1F5F9' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
          border: '1px solid #F1F5F9',
          transition: 'box-shadow 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid #E2E8F0',
          boxShadow: 'none',
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#FFFFFF',
            '& fieldset': { borderColor: '#E2E8F0' },
            '&:hover fieldset': { borderColor: '#94A3B8' },
            '&.Mui-focused fieldset': { borderColor: '#4F46E5', borderWidth: 1.5 },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.75rem',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#F8FAFC',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#64748B',
            borderBottom: '1px solid #E2E8F0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #F1F5F9',
          fontSize: '0.875rem',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: '#E2E8F0' },
        bar: { borderRadius: 4 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.875rem' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 44,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: { height: 2, borderRadius: 2 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '1px 8px',
          '&.Mui-selected': {
            backgroundColor: '#EEF2FF',
            color: '#4F46E5',
            '& .MuiListItemIcon-root': { color: '#4F46E5' },
            '&:hover': { backgroundColor: '#E0E7FF' },
          },
          '&:hover': { backgroundColor: '#F8FAFC' },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: '#EEF2FF',
          color: '#4F46E5',
          fontWeight: 600,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#E2E8F0' },
      },
    },
  },
});

export const getTheme = () => {
  return minimalProTheme;
};

// Export default theme
export default getTheme();

