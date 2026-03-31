import { CircularProgress, ThemeProvider } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';

import { AppProvider, useAppContext } from './context/AppContext';
import { DEVELOPER_VAULT_ROUTE } from './lib/accountPackageConstants';
import { createAppTheme } from './lib/theme';
import { AppShell } from './components/AppShell';

const BootstrapPage = lazy(() => import('./pages/BootstrapPage').then((module) => ({ default: module.BootstrapPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const ChangePasswordPage = lazy(() => import('./pages/ChangePasswordPage').then((module) => ({ default: module.ChangePasswordPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const ProductionPage = lazy(() => import('./pages/ProductionPage').then((module) => ({ default: module.ProductionPage })));
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage').then((module) => ({ default: module.ApprovalsPage })));
const AdminPage = lazy(() => import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })));
const BulkPage = lazy(() => import('./pages/BulkPage').then((module) => ({ default: module.BulkPage })));
const DeveloperVaultPage = lazy(() =>
  import('./pages/DeveloperVaultPage').then((module) => ({ default: module.DeveloperVaultPage }))
);
const AboutPage = lazy(() => import('./pages/AboutPage').then((module) => ({ default: module.AboutPage })));

const rtlCache = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin]
});

function AppRoutes() {
  const { isReady, hasUsers, currentUser, settings } = useAppContext();
  const location = useLocation();
  const isDeveloperVaultRoute = location.pathname === DEVELOPER_VAULT_ROUTE;
  const isPublicAboutRoute = location.pathname === '/about';
  const themeMode = settings?.themeMode ?? 'light';

  useEffect(() => {
    document.documentElement.style.colorScheme = themeMode;
    document.body.dataset.themeMode = themeMode;
    document.documentElement.dataset.themeMode = themeMode;
  }, [themeMode]);

  if (!isReady) {
    return (
      <div className="app-loading-screen">
        <CircularProgress />
      </div>
    );
  }

  if (!hasUsers && location.pathname !== '/bootstrap' && !isDeveloperVaultRoute && !isPublicAboutRoute) {
    return <Navigate to="/bootstrap" replace />;
  }

  if (hasUsers && !currentUser && location.pathname !== '/login' && !isDeveloperVaultRoute && !isPublicAboutRoute) {
    return <Navigate to="/login" replace />;
  }

  if (
    currentUser?.forcePasswordChange &&
    location.pathname !== '/change-password' &&
    !isDeveloperVaultRoute &&
    !isPublicAboutRoute
  ) {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <ThemeProvider theme={createAppTheme(themeMode)}>
      <Suspense
        fallback={
          <div className="app-loading-screen">
            <CircularProgress />
          </div>
        }
      >
        <Routes>
          <Route path="/bootstrap" element={<BootstrapPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ChangePasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path={DEVELOPER_VAULT_ROUTE} element={<DeveloperVaultPage />} />
          <Route
            path="*"
            element={
              currentUser ? (
                <AppShell>
                  <Routes>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/production" element={<ProductionPage />} />
                    <Route path="/approvals" element={<ApprovalsPage />} />
                    <Route path="/bulk" element={<BulkPage />} />
                    <Route path="/admin" element={<AdminPage />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </AppShell>
              ) : (
                <Navigate to={hasUsers ? '/login' : '/bootstrap'} replace />
              )
            }
          />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <CacheProvider value={rtlCache}>
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </CacheProvider>
  );
}
