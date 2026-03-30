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
  Typography
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import DatasetLinkedRoundedIcon from '@mui/icons-material/DatasetLinkedRounded';
import FactCheckRoundedIcon from '@mui/icons-material/FactCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { appDb } from '../lib/db';
import { useAppContext } from '../context/AppContext';
import { useDeveloperVaultTrigger } from '../hooks/useDeveloperVaultTrigger';

const drawerWidth = 280;

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, settings, saveSettings } = useAppContext();
  const notifications = useLiveQuery(
    () => appDb.notifications.orderBy('createdAt').reverse().limit(12).toArray(),
    [],
    []
  );
  const unreadCount = notifications.filter((item) => !item.read).length;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const openDeveloperVault = useDeveloperVaultTrigger();

  const items = [
    { path: '/dashboard', label: 'لوحة التحكم', icon: <DashboardRoundedIcon /> },
    { path: '/production', label: 'إدخال الإنتاج', icon: <Inventory2RoundedIcon /> },
    { path: '/approvals', label: 'الاعتمادات', icon: <FactCheckRoundedIcon /> },
    { path: '/bulk', label: 'Free Engine Bulk', icon: <DatasetLinkedRoundedIcon /> },
    { path: '/admin', label: 'لوحة الإدارة', icon: <SettingsRoundedIcon /> }
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <CssBaseline />
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderLeft: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            background:
              settings?.themeMode === 'dark'
                ? 'linear-gradient(180deg, rgba(19,34,58,.96) 0%, rgba(7,17,31,.98) 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,.98) 0%, rgba(239,246,255,.98) 100%)'
          }
        }}
      >
        <Toolbar>
          <Stack spacing={0.5} sx={{ cursor: 'default', userSelect: 'none' }} onClick={openDeveloperVault}>
            <Typography variant="h5">Minibo Systems</Typography>
            <Typography variant="body2" color="text.secondary">
              A New Era for Everyone
            </Typography>
          </Stack>
        </Toolbar>
        <Divider />
        <List sx={{ px: 1.5, py: 2 }}>
          {items.map((item) => (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => navigate(item.path)}
              sx={{ mb: 1, borderRadius: 3 }}
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
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(14px)' }}>
          <Toolbar sx={{ gap: 1.5 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6">إدارة خطوط الإنتاج واعتمادها</Typography>
            </Box>
            <Tooltip title={settings?.themeMode === 'dark' ? 'الثيم النهاري' : 'الثيم الليلي'}>
              <IconButton
                onClick={() => saveSettings({ themeMode: settings?.themeMode === 'dark' ? 'light' : 'dark' })}
              >
                {settings?.themeMode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
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

        <Box sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>{children}</Box>
      </Box>

      <Drawer
        anchor="left"
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 360,
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
