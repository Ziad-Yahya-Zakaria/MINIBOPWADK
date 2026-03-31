import { useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DatasetLinkedRoundedIcon from '@mui/icons-material/DatasetLinkedRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';

import { appDb } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { useDeveloperVaultTrigger } from '../hooks/useDeveloperVaultTrigger';

const drawerWidth = 284;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, settings, saveSettings } = useAppContext();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const notifications = useLiveQuery(
    () => appDb.notifications.orderBy('createdAt').reverse().limit(12).toArray(),
    [],
    []
  );
  const unreadCount = notifications.filter((item) => !item.read).length;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const openDeveloperVault = useDeveloperVaultTrigger();

  const items = [
    { path: '/dashboard', label: 'لوحة التحكم', icon: <DashboardRoundedIcon /> },
    { path: '/production', label: 'إدخال الإنتاج', icon: <Inventory2RoundedIcon /> },
    { path: '/approvals', label: 'الاعتمادات', icon: <FactCheckRoundedIcon /> },
    { path: '/bulk', label: 'Free Engine Bulk', icon: <DatasetLinkedRoundedIcon /> },
    { path: '/about', label: 'معلومات النظام', icon: <InfoRoundedIcon /> },
    { path: '/admin', label: 'لوحة الإدارة', icon: <SettingsRoundedIcon /> }
  ];

  const drawerContent = (
    <>
      <Toolbar>
        <Stack
          spacing={0.5}
          sx={{ cursor: 'default', userSelect: 'none' }}
          onClick={openDeveloperVault}
        >
          <Typography variant="h5">Minibo Systems</Typography>
          <Typography variant="body2" color="text.secondary">
            Enterprise Operations Workspace
          </Typography>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.5, py: 2 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => {
              navigate(item.path);
              setNavOpen(false);
            }}
            sx={{
              mb: 1,
              borderRadius: 3,
              minHeight: 48,
              '&.Mui-selected': {
                backgroundColor: 'action.selected'
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Typography variant="subtitle2">{currentUser?.displayName}</Typography>
        <Typography variant="body2" color="text.secondary">
          {currentUser?.username}
        </Typography>
      </Box>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <CssBaseline />
      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? true : navOpen}
        onClose={() => setNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isDesktop ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isDesktop ? drawerWidth : 'min(88vw, 320px)',
            boxSizing: 'border-box',
            borderLeft: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            background:
              settings?.themeMode === 'dark'
                ? 'linear-gradient(180deg, rgba(15,27,24,.98) 0%, rgba(9,19,17,.99) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(244,249,246,.98) 100%)'
          }
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(14px)'
          }}
        >
          <Toolbar sx={{ gap: 1.5 }}>
            <IconButton
              onClick={() => setNavOpen(true)}
              sx={{ display: { xs: 'inline-flex', lg: 'none' } }}
            >
              <MenuRoundedIcon />
            </IconButton>
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="h6">إدارة خطوط الإنتاج واعتمادها</Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                واجهة تشغيل موحدة بإدخال جدولي واعتماد وتصدير مؤسسي
              </Typography>
            </Box>
            <Tooltip title={settings?.themeMode === 'dark' ? 'الثيم النهاري' : 'الثيم الليلي'}>
              <IconButton
                onClick={() =>
                  saveSettings({
                    themeMode: settings?.themeMode === 'dark' ? 'light' : 'dark'
                  })
                }
              >
                {settings?.themeMode === 'dark' ? (
                  <LightModeRoundedIcon />
                ) : (
                  <DarkModeRoundedIcon />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="الإشعارات">
              <IconButton onClick={() => setNotificationsOpen(true)}>
                <Badge color="error" badgeContent={unreadCount}>
                  <NotificationsRoundedIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="تسجيل الخروج">
              <IconButton onClick={logout}>
                <LogoutRoundedIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flexGrow: 1,
            minWidth: 0,
            p: { xs: 1.5, md: 2.5, xl: 3 },
            overflowX: 'hidden'
          }}
        >
          {children}
        </Box>
      </Box>

      <Drawer
        anchor="left"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: 'min(88vw, 360px)', md: 360 },
            p: 2
          }
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>
          مركز الإشعارات
        </Typography>
        <Stack spacing={1.5}>
          {notifications.map((item) => (
            <Box
              key={item.id}
              sx={{
                border: '1px solid',
                borderColor: item.read ? 'divider' : 'primary.main',
                borderRadius: 3,
                p: 2,
                backgroundColor: item.read ? 'background.paper' : 'action.hover'
              }}
            >
              <Typography variant="subtitle2">{item.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {item.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.createdAt).toLocaleString('ar-EG')}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Drawer>
    </Box>
  );
}
