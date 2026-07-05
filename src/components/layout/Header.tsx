import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PanelLeft, Search, Moon, Sun, Bell, Sparkles,
  Settings, LifeBuoy, Store, LogOut, CheckCheck,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { signOut } from '../../services/auth';
import { GhostButton } from '../ui';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const businessProfile = useAppStore((s) => s.businessProfile);
  const notifications = useAppStore((s) => s.notifications);
  const addNotification = useAppStore((s) => s.addNotification);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const clearNotifications = useAppStore((s) => s.clearNotifications);
  const showToast = useAppStore((s) => s.showToast);
  const user = useAppStore((s) => s.user);

  const [now, setNow] = useState(new Date());
  const [openMenu, setOpenMenu] = useState<'none' | 'notifications' | 'account'>('none');
  const wrapRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Seed a few realistic notifications once so the bell has content.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (useAppStore.getState().notifications.length === 0) {
      addNotification('Low stock: 3 products need restocking', 'warning');
      addNotification('Payment received from Thabo M. · R1,240', 'success');
      addNotification('Your weekly AI business report is ready', 'info');
    }
  }, [addNotification]);

  // Close dropdowns on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpenMenu('none');
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const dateStr = now.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const initials = (businessProfile?.name || 'NODAL')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const toneDot = {
    success: 'bg-positive',
    warning: 'bg-accent',
    error: 'bg-negative',
    info: 'bg-faint',
  } as const;

  const go = (path: string) => {
    setOpenMenu('none');
    navigate(path);
  };

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 rounded-none border-x-0 border-t-0 px-5 sm:px-7">
      <GhostButton onClick={toggleSidebar} aria-label="Toggle navigation">
        <PanelLeft size={18} strokeWidth={1.75} />
      </GhostButton>

      {/* Low-contrast search — surfaces on focus */}
      <label className="group flex h-10 max-w-md flex-1 items-center gap-2.5 rounded-full bg-surface px-4 text-muted transition-colors focus-within:bg-surface-2">
        <Search size={16} strokeWidth={1.75} className="shrink-0" />
        <input
          type="text"
          placeholder="Search products, sales, suppliers…"
          className="w-full bg-transparent text-[0.875rem] text-ink placeholder:text-faint focus:outline-none"
        />
      </label>

      <div ref={wrapRef} className="ml-auto flex items-center gap-2">
        {/* AI status — terracotta callout */}
        <div className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 sm:flex">
          <Sparkles size={14} strokeWidth={2} className="text-accent" />
          <span className="text-[0.75rem] font-semibold tracking-[0.02em] text-accent">AI Active</span>
        </div>

        <span className="tnum hidden text-[0.8125rem] text-muted lg:inline">
          {dateStr} · {timeStr}
        </span>

        {/* Notifications */}
        <div className="relative">
          <GhostButton
            aria-label="Notifications"
            onClick={() => setOpenMenu((m) => (m === 'notifications' ? 'none' : 'notifications'))}
          >
            <Bell size={18} strokeWidth={1.75} />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-bold leading-none text-accent-contrast">
                {unreadCount}
              </span>
            )}
          </GhostButton>

          {openMenu === 'notifications' && (
            <div className="glass-strong animate-rise absolute right-0 top-12 z-30 w-80 overflow-hidden rounded-[18px]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-[0.9375rem] font-semibold text-ink">Notifications</span>
                {notifications.length > 0 && (
                  <button
                    onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                    className="flex items-center gap-1 text-[0.75rem] font-medium text-accent hover:underline"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto nodal-scroll">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[0.8125rem] text-muted">You're all caught up.</p>
                ) : (
                  [...notifications].reverse().map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-inset/60"
                    >
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-hairline' : toneDot[n.type]}`} />
                      <span className={`flex-1 text-[0.8125rem] leading-snug ${n.read ? 'text-muted' : 'text-ink'}`}>
                        {n.message}
                      </span>
                    </button>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={() => clearNotifications()}
                  className="w-full border-t border-hairline px-4 py-2.5 text-center text-[0.75rem] font-medium text-muted transition-colors hover:bg-surface-inset/60 hover:text-ink"
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>

        <GhostButton onClick={toggleDarkMode} aria-label="Toggle theme">
          {darkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </GhostButton>

        {/* Account */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu((m) => (m === 'account' ? 'none' : 'account'))}
            className="ml-1 grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-[0.8125rem] font-semibold text-ink transition-transform hover:scale-105"
            aria-label="Account"
          >
            {initials}
          </button>

          {openMenu === 'account' && (
            <div className="glass-strong animate-rise absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-[18px]">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-[0.8125rem] font-semibold text-accent-contrast">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[0.875rem] font-semibold text-ink">{businessProfile?.name || 'NODAL'}</p>
                  <p className="truncate text-[0.75rem] text-muted">{user?.email || 'Owner · Admin'}</p>
                </div>
              </div>
              <div className="border-t border-hairline py-1.5">
                <MenuItem icon={Store} label="Storefront profile" onClick={() => go('/storefront')} />
                <MenuItem icon={Settings} label="Settings" onClick={() => go('/settings')} />
                <MenuItem icon={LifeBuoy} label="Help & support" onClick={() => go('/help')} />
              </div>
              <div className="border-t border-hairline py-1.5">
                <MenuItem
                  icon={LogOut}
                  label="Sign out"
                  danger
                  onClick={() => {
                    setOpenMenu('none');
                    signOut().catch(() => showToast('Sign out failed — try again.', 'error'));
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const MenuItem: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-[0.8125rem] font-medium transition-colors hover:bg-surface-inset/60 ${
      danger ? 'text-negative' : 'text-ink'
    }`}
  >
    <Icon className="h-4 w-4 shrink-0" />
    {label}
  </button>
);

export default Header;
