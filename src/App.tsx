import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppShell } from './components/layout';
import { useAppStore } from './stores/appStore';
import { subscribeToAuth } from './services/auth';
import { getTheme } from './theme';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

// Lazy load other pages (we'll create them next)
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Sales = React.lazy(() => import('./pages/Sales'));
const CashFlow = React.lazy(() => import('./pages/CashFlow'));
const Suppliers = React.lazy(() => import('./pages/Suppliers'));
const Storefront = React.lazy(() => import('./pages/Storefront'));
const PublicStorefront = React.lazy(() => import('./pages/PublicStorefront'));
const AIHub = React.lazy(() => import('./pages/AIHub'));
const AIChat = React.lazy(() => import('./pages/AIChat'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Help = React.lazy(() => import('./pages/Help'));
const Placeholder = React.lazy(() => import('./pages/Placeholder'));

// Loading component
const PageLoader: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh' 
  }}>
    Loading...
  </div>
);

function App() {
  const darkMode = useAppStore((s) => s.darkMode);
  const theme = React.useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  // Single auth listener — drives user state, data loading and sign-out resets.
  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => {
      useAppStore.getState().setAuthUser(u);
    });
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          {/* Public storefront — shareable, no sign-in required */}
          <Route
            path="/store/:slug"
            element={
              <React.Suspense fallback={<PageLoader />}>
                <PublicStorefront />
              </React.Suspense>
            }
          />
          {/* Everything else lives behind the auth gate */}
          <Route path="/*" element={<GatedApp />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

const GatedApp: React.FC = () => {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);

  // Waiting on Firebase to restore the session — quiet branded splash.
  if (!authReady) {
    return (
      <div className="nodal-root flex min-h-screen items-center justify-center bg-canvas text-ink">
        <p className="animate-pulse text-[1.5rem] font-extrabold tracking-[-0.03em]">
          NODAL<span className="text-accent">.</span>
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route
              path="ai"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <AIHub />
                </React.Suspense>
              }
            />
            <Route
              path="coach"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <AIChat />
                </React.Suspense>
              }
            />
            <Route
              path="inventory"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Inventory />
                </React.Suspense>
              }
            />
            <Route
              path="sales"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Sales />
                </React.Suspense>
              }
            />
            <Route
              path="cashflow"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <CashFlow />
                </React.Suspense>
              }
            />
            <Route
              path="suppliers"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Suppliers />
                </React.Suspense>
              }
            />
            <Route
              path="storefront"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Storefront />
                </React.Suspense>
              }
            />
            <Route
              path="settings"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Settings />
                </React.Suspense>
              }
            />
            <Route
              path="help"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Help />
                </React.Suspense>
              }
            />
            <Route
              path="*"
              element={
                <React.Suspense fallback={<PageLoader />}>
                  <Placeholder />
                </React.Suspense>
              }
            />
          </Route>
      </Routes>
  );
};

export default App;

