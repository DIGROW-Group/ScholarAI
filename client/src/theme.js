import { createTheme } from '@mui/material/styles';

// Destination Success AI theme - Yellow/Orange, Black, and Grey
const destinationTheme = createTheme({
  palette: {
    primary: {
      main: '#ea9b20', // Orange/yellow from logo
      light: '#FFB84D',
      dark: '#C77A0A',
      contrastText: '#000000',
    },
    secondary: {
      main: '#424242', // Dark grey
      light: '#616161',
      dark: '#212121',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#ea9b20',
    },
    warning: {
      main: '#FF6B35',
    },
    error: {
      main: '#EF5350',
    },
    info: {
      main: '#757575', // Grey
    },
    background: {
      default: '#F5F5F5', // Light grey
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000', // Black
      secondary: '#424242', // Dark grey
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

export const getTheme = () => {
  return destinationTheme;
};

// Export default theme - uses getTheme() to ensure it's dynamic
export default getTheme();

