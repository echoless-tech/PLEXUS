import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout';
import { useAppStore } from './stores/appStore';
import { subscribeToAuth } from './services/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const Contracts = React.lazy(() => import('./pages/Contracts'));
const NewContract = React.lazy(() => import('./pages/NewContract'));
const ContractDetail = React.lazy(() => import('./pages/ContractDetail'));
const Verification = React.lazy(() => import('./pages/Verification'));
const Settings = React.lazy(() => import('./pages/Settings'));

const PageLoader: React.FC = () => (
  <div className="flex h-[50vh] items-center justify-center text-sm text-muted">Loading…</div>
);

const lazy = (el: React.ReactNode) => <React.Suspense fallback={<PageLoader />}>{el}</React.Suspense>;

function App() {
  useEffect(() => {
    const unsubscribe = subscribeToAuth((u) => useAppStore.getState().setAuthUser(u));
    return unsubscribe;
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Routes>
        {/* Every route lives behind the auth gate — there is no public surface. */}
        <Route path="/*" element={<GatedApp />} />
      </Routes>
    </BrowserRouter>
  );
}

const GatedApp: React.FC = () => {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);

  if (!authReady) {
    return (
      <div className="plexus-root flex min-h-screen items-center justify-center bg-canvas text-ink">
        <p className="animate-pulse text-[1.5rem] font-extrabold tracking-[-0.03em]">
          PLEXUS<span className="text-accent">.</span>
        </p>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="contracts" element={lazy(<Contracts />)} />
        <Route path="contracts/new" element={lazy(<NewContract />)} />
        <Route path="contracts/:id" element={lazy(<ContractDetail />)} />
        <Route path="contracts/:id/edit" element={lazy(<NewContract />)} />
        <Route path="verification" element={lazy(<Verification />)} />
        <Route path="settings" element={lazy(<Settings />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
