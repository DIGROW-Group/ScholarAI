import React, { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ColorModeContext = createContext({
  mode: 'light',
  toggleColorMode: () => {},
});

export const useColorMode = () => useContext(ColorModeContext);

export const ColorModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('scholarai_theme_mode') || 'light';
  });

  const toggleColorMode = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('scholarai_theme_mode', newMode);
      return newMode;
    });
  };

  const colorMode = useMemo(
    () => ({
      mode,
      toggleColorMode,
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          ...(mode === 'light'
            ? {
                primary: { main: '#4F46E5', light: '#818CF8', dark: '#3730A3', contrastText: '#FFFFFF' },
                secondary: { main: '#64748B', light: '#94A3B8', dark: '#334155', contrastText: '#FFFFFF' },
                background: { default: '#F8FAFC', paper: '#FFFFFF' },
                text: { primary: '#0F172A', secondary: '#64748B' },
                divider: '#E2E8F0',
              }
            : {
                primary: { main: '#6366F1', light: '#818CF8', dark: '#4F46E5', contrastText: '#FFFFFF' },
                secondary: { main: '#94A3B8', light: '#CBD5E1', dark: '#64748B', contrastText: '#0F172A' },
                background: { default: '#0B0F19', paper: '#1E293B' },
                text: { primary: '#F8FAFC', secondary: '#94A3B8' },
                divider: '#334155',
              }),
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
        shape: { borderRadius: 10 },
        components: {
          MuiCssBaseline: {
            styleOverrides: `
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
              * { box-sizing: border-box; }
              body {
                -webkit-font-smoothing: antialiased;
                background-color: ${mode === 'dark' ? '#0B0F19' : '#F8FAFC'} !important;
                color: ${mode === 'dark' ? '#F8FAFC' : '#0F172A'} !important;
              }
              ${mode === 'dark' ? `
                .MuiAppBar-root {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                  border-bottom: 1px solid #334155 !important;
                }
                .MuiPaper-root {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                  border-color: #334155 !important;
                }
                .MuiCard-root {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                  border-color: #334155 !important;
                }
                .MuiTableCell-root {
                  color: #F8FAFC !important;
                  border-bottom: 1px solid #334155 !important;
                }
                .MuiTableHead-root .MuiTableCell-root {
                  background-color: #0F172A !important;
                  color: #94A3B8 !important;
                }
                .MuiTypography-colorTextPrimary {
                  color: #F8FAFC !important;
                }
                .MuiTypography-colorTextSecondary {
                  color: #94A3B8 !important;
                }
                .MuiInputBase-input {
                  color: #F8FAFC !important;
                }
                .MuiOutlinedInput-notchedOutline {
                  border-color: #334155 !important;
                }
                .MuiListItemButton-root {
                  color: #F8FAFC !important;
                }
                .MuiDrawer-paper {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                  border-right: 1px solid #334155 !important;
                }
                .MuiDialog-paper {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                }
                .MuiDialogContent-root {
                  color: #F8FAFC !important;
                }
                .MuiTab-root {
                  color: #94A3B8 !important;
                }
                .MuiTab-root.Mui-selected {
                  color: #818CF8 !important;
                }
                /* Dark mode inline override helpers */
                [style*="background-color: rgb(255, 255, 255)"],
                [style*="background-color: #FFFFFF"],
                [style*="background-color: #ffffff"] {
                  background-color: #1E293B !important;
                  color: #F8FAFC !important;
                  border-color: #334155 !important;
                }
                [style*="background-color: rgb(248, 250, 252)"],
                [style*="background-color: #F8FAFC"],
                [style*="background-color: #f8fafc"] {
                  background-color: #0F172A !important;
                  color: #F8FAFC !important;
                  border-color: #334155 !important;
                }
              ` : ''}
            `,
          },
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
