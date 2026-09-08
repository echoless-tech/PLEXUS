import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout';
import { useAppStore } from './stores/appStore';
import { subscribeToAuth } from './services/auth';
import Login from './pages/Login';
import ChooseAccountType from './pages/ChooseAccountType';

// Business
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Run = React.lazy(() => import('./pages/Run'));
const Connect = React.lazy(() => import('./pages/Connect'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Contracts = React.lazy(() => import('./pages/Contracts'));
const NewContract = React.lazy(() => import('./pages/NewContract'));
const ContractDetail = React.lazy(() => import('./pages/ContractDetail'));

// Funder
const FunderDashboard = React.lazy(() => import('./pages/FunderDashboard'));
const FunderSmeDetail = React.lazy(() => import('./pages/FunderSmeDetail'));
const FunderOpportunities = React.lazy(() => import('./pages/FunderOpportunities'));

// Shared
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

const Splash: React.FC = () => (
  <div className="plexus-root flex min-h-screen items-center justify-center bg-canvas text-ink">
    <p className="animate-pulse text-[1.5rem] font-extrabold tracking-[-0.03em]">
      PLEXUS<span className="text-accent">.</span>
    </p>
  </div>
);

const GatedApp: React.FC = () => {
  const user = useAppStore((s) => s.user);
  const authReady = useAppStore((s) => s.authReady);
  const identityReady = useAppStore((s) => s.identityReady);
  const profile = useAppStore((s) => s.profile);

  if (!authReady) return <Splash />;
  if (!user) return <Login />;
  if (!identityReady) return <Splash />;

  // Every account must declare what it is before it can do anything.
  if (!profile?.accountType) return <ChooseAccountType />;

  if (profile.accountType === 'funder') {
    return (
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={lazy(<FunderDashboard />)} />
          <Route path="funder/sme/:uid" element={lazy(<FunderSmeDetail />)} />
          <Route path="funder/plans" element={lazy(<FunderOpportunities />)} />
          <Route path="contracts/:id" element={lazy(<ContractDetail />)} />
          <Route path="verification" element={lazy(<Verification />)} />
          <Route path="settings" element={lazy(<Settings />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={lazy(<Dashboard />)} />
        <Route path="run" element={lazy(<Run />)} />
        <Route path="connect" element={lazy(<Connect />)} />
        <Route path="analytics" element={lazy(<Analytics />)} />
        <Route path="statistics" element={lazy(<Analytics />)} />
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
