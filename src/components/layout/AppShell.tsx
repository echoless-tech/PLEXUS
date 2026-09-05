import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { applyAccentTheme } from '../../theme/accents';

const DRAWER_WIDTH = 264;
const COLLAPSED_WIDTH = 76;

export const AppShell: React.FC = () => {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const darkMode = useAppStore((s) => s.darkMode);
  const accentTheme = useAppStore((s) => s.accentTheme);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    applyAccentTheme(accentTheme, darkMode ? 'dark' : 'light');
  }, [accentTheme, darkMode]);

  return (
    <div className="plexus-root min-h-screen bg-canvas text-ink">
      <Sidebar width={DRAWER_WIDTH} collapsedWidth={COLLAPSED_WIDTH} />

      <div
        className="flex min-h-screen flex-col pl-0 transition-[padding] duration-300 ease-out md:pl-[var(--shell-pad)]"
        style={{ ['--shell-pad' as string]: `${sidebarOpen ? DRAWER_WIDTH : COLLAPSED_WIDTH}px` }}
      >
        <Header />
        <main key={location.pathname} className="plexus-scroll flex-1 px-5 pb-10 pt-2 sm:px-7">
          <Outlet />
        </main>
      </div>

      <Toaster />
    </div>
  );
};

export default AppShell;
