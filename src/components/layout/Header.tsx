import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PanelLeft, Menu, Moon, Sun, ShieldCheck, Settings, LogOut, MailWarning } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { signOut, sendVerificationEmail } from '../../services/auth';
import { GhostButton } from '../ui';
import { VerificationBadge } from '../common';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleMobileNav = useAppStore((s) => s.toggleMobileNav);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const profile = useAppStore((s) => s.profile);
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);

  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const name = profile?.businessName || 'PLEXUS';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const go = (path: string) => {
    setMenuOpen(false);
    navigate(path);
  };

  const resend = async () => {
    try {
      await sendVerificationEmail();
      showToast('Verification email sent — check your inbox.', 'success');
    } catch {
      showToast('Could not send the email right now.', 'error');
    }
  };

  return (
    <header className="glass sticky top-0 z-20 flex h-16 items-center gap-3 rounded-none border-x-0 border-t-0 px-5 sm:px-7">
      <GhostButton onClick={toggleMobileNav} aria-label="Open navigation" className="md:hidden">
        <Menu size={18} strokeWidth={1.75} />
      </GhostButton>
      <GhostButton onClick={toggleSidebar} aria-label="Toggle navigation" className="hidden md:inline-flex">
        <PanelLeft size={18} strokeWidth={1.75} />
      </GhostButton>

      <span className="text-[1.0625rem] font-bold tracking-[-0.02em] text-ink sm:hidden">PLEXUS</span>

      {user && !user.emailVerified && (
        <button
          onClick={resend}
          className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-[0.75rem] font-semibold text-accent transition-opacity hover:opacity-80 sm:flex"
          title="Your email is not verified yet. Click to resend the link."
        >
          <MailWarning size={14} strokeWidth={2} />
          Verify your email
        </button>
      )}

      <div ref={wrapRef} className="ml-auto flex items-center gap-2">
        {profile && (
          <div className="hidden sm:block">
            <VerificationBadge status={profile.verificationStatus} />
          </div>
        )}

        <GhostButton onClick={toggleDarkMode} aria-label="Toggle theme">
          {darkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
        </GhostButton>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account"
            className="neu-sm grid h-9 w-9 place-items-center rounded-full bg-ink text-[0.75rem] font-bold text-canvas"
          >
            {initials || 'P'}
          </button>

          {menuOpen && (
            <div className="glass-strong animate-rise absolute right-0 top-12 z-30 w-64 overflow-hidden rounded-[18px]">
              <div className="border-b border-hairline px-4 py-3">
                <p className="truncate text-[0.875rem] font-semibold text-ink">{name}</p>
                <p className="truncate text-[0.75rem] text-muted">{user?.email}</p>
              </div>
              <div className="p-1.5">
                <MenuItem icon={ShieldCheck} label="Verification" onClick={() => go('/verification')} />
                <MenuItem icon={Settings} label="Settings" onClick={() => go('/settings')} />
                <div className="my-1 h-px bg-hairline" />
                <MenuItem
                  icon={LogOut}
                  label="Sign out"
                  onClick={async () => {
                    setMenuOpen(false);
                    await signOut();
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

const MenuItem: React.FC<{ icon: React.ElementType; label: string; onClick: () => void }> = ({
  icon: Icon,
  label,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.8125rem] text-ink transition-colors hover:bg-surface-inset/60"
  >
    <Icon size={16} strokeWidth={1.75} className="text-muted" />
    {label}
  </button>
);

export default Header;
