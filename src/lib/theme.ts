import { createTheme } from '@mui/material/styles';

import type { ThemeMode } from './types';

export function createAppTheme(mode: ThemeMode) {
  const isDark = mode === 'dark';
  return createTheme({
    direction: 'rtl',
    shape: {
      borderRadius: 16
    },
    typography: {
      fontFamily: 'Cairo, sans-serif',
      h4: {
        fontWeight: 800
      },
      h5: {
        fontWeight: 800
      },
      h6: {
        fontWeight: 700
      }
    },
    palette: {
      mode,
      primary: {
        main: isDark ? '#36cfc9' : '#155eef'
      },
      secondary: {
        main: isDark ? '#f59e0b' : '#0f766e'
      },
      background: {
        default: isDark ? '#07111f' : '#eef2ff',
        paper: isDark ? '#0f172a' : '#ffffff'
      },
      success: {
        main: '#16a34a'
      },
      warning: {
        main: '#d97706'
      }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        }
      }
    }
  });
}
