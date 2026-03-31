import { createTheme } from '@mui/material/styles';

import type { ThemeMode } from './types';

export function createAppTheme(mode: ThemeMode) {
  const isDark = mode === 'dark';
  return createTheme({
    direction: 'rtl',
    shape: {
      borderRadius: 18
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
        main: isDark ? '#3cc79e' : '#0f7a5d',
        dark: isDark ? '#2aa37f' : '#0b5a46',
        light: isDark ? '#78e0c0' : '#61b79b',
        contrastText: '#ffffff'
      },
      secondary: {
        main: isDark ? '#f1b24b' : '#c98512',
        dark: isDark ? '#d99d3f' : '#9d650a',
        light: isDark ? '#ffd88e' : '#ebb562',
        contrastText: isDark ? '#1d1303' : '#ffffff'
      },
      text: {
        primary: isDark ? '#edf7f1' : '#123127',
        secondary: isDark ? '#a2b9ae' : '#5a7266'
      },
      background: {
        default: isDark ? '#091311' : '#edf4f0',
        paper: isDark ? '#0f1b18' : '#ffffff'
      },
      divider: isDark ? 'rgba(120, 224, 192, 0.12)' : 'rgba(15, 122, 93, 0.12)',
      action: {
        hover: isDark ? 'rgba(60, 199, 158, 0.10)' : 'rgba(15, 122, 93, 0.07)',
        selected: isDark ? 'rgba(60, 199, 158, 0.14)' : 'rgba(15, 122, 93, 0.12)'
      },
      success: {
        main: '#16a34a'
      },
      warning: {
        main: '#d97706'
      },
      info: {
        main: isDark ? '#63c6ff' : '#0b76b7'
      }
    },
    shadows: [
      'none',
      '0 2px 10px rgba(12, 38, 28, 0.04)',
      '0 6px 16px rgba(12, 38, 28, 0.06)',
      '0 10px 22px rgba(12, 38, 28, 0.08)',
      '0 14px 28px rgba(12, 38, 28, 0.10)',
      '0 18px 34px rgba(12, 38, 28, 0.12)',
      '0 20px 36px rgba(12, 38, 28, 0.13)',
      '0 24px 44px rgba(12, 38, 28, 0.14)',
      '0 28px 50px rgba(12, 38, 28, 0.15)',
      '0 32px 56px rgba(12, 38, 28, 0.16)',
      '0 34px 58px rgba(12, 38, 28, 0.17)',
      '0 36px 60px rgba(12, 38, 28, 0.18)',
      '0 38px 62px rgba(12, 38, 28, 0.19)',
      '0 40px 64px rgba(12, 38, 28, 0.20)',
      '0 42px 66px rgba(12, 38, 28, 0.21)',
      '0 44px 68px rgba(12, 38, 28, 0.22)',
      '0 46px 70px rgba(12, 38, 28, 0.23)',
      '0 48px 72px rgba(12, 38, 28, 0.24)',
      '0 50px 74px rgba(12, 38, 28, 0.25)',
      '0 52px 76px rgba(12, 38, 28, 0.26)',
      '0 54px 78px rgba(12, 38, 28, 0.27)',
      '0 56px 80px rgba(12, 38, 28, 0.28)',
      '0 58px 82px rgba(12, 38, 28, 0.29)',
      '0 60px 84px rgba(12, 38, 28, 0.30)',
      '0 62px 86px rgba(12, 38, 28, 0.31)'
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            colorScheme: mode
          },
          'html, body, #root': {
            minHeight: '100%'
          },
          body: {
            margin: 0,
            backgroundColor: isDark ? '#091311' : '#edf4f0',
            backgroundImage: isDark
              ? 'radial-gradient(circle at top right, rgba(60,199,158,.14), transparent 24%), radial-gradient(circle at bottom left, rgba(241,178,75,.12), transparent 20%)'
              : 'radial-gradient(circle at top right, rgba(15,122,93,.14), transparent 24%), radial-gradient(circle at bottom left, rgba(201,133,18,.10), transparent 22%)',
            color: isDark ? '#edf7f1' : '#123127',
            transition: 'background-color .2s ease, color .2s ease'
          },
          '*::-webkit-scrollbar': {
            width: '10px',
            height: '10px'
          },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: isDark ? 'rgba(120, 224, 192, 0.25)' : 'rgba(15, 122, 93, 0.24)',
            borderRadius: '999px'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${isDark ? 'rgba(120, 224, 192, 0.10)' : 'rgba(15, 122, 93, 0.10)'}`,
            boxShadow: isDark
              ? '0 18px 40px rgba(0, 0, 0, 0.28)'
              : '0 18px 36px rgba(12, 38, 28, 0.08)'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: 14,
            fontWeight: 700,
            minHeight: 44
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 14
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.82)',
            transition: 'background-color .2s ease, border-color .2s ease',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(120, 224, 192, 0.14)' : 'rgba(15, 122, 93, 0.16)'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: isDark ? 'rgba(120, 224, 192, 0.28)' : 'rgba(15, 122, 93, 0.28)'
            },
            '&.Mui-focused': {
              backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff'
            }
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: isDark ? 'rgba(9, 19, 17, 0.74)' : 'rgba(237, 244, 240, 0.82)'
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 999
          }
        }
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 700,
            minHeight: 46
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 800,
            color: isDark ? '#d5ede2' : '#23453a',
            backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15, 122, 93, 0.04)'
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 700
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 16
          }
        }
      }
    }
  });
}
