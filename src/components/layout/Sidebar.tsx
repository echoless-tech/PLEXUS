import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSignature,
  FilePlus2,
  ShieldCheck,
  Settings,
  X,
  FolderOpen,
  Users,
  BarChart3,
  Landmark,
  ListChecks,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/cn';
import { BusinessAvatar } from '../common';

/** Mobile drawer is always full-label width, independent of the desktop collapse state. */
const DRAWER_WIDTH_MOBILE = 272;

interface SidebarProps {
  width: number;
  collapsedWidth: number;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  /** Match nested routes too (e.g. /contracts/:id). */
  prefix?: boolean;
}

const businessNav: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: <LayoutDashboard size={19} strokeWidth={1.75} /> },
  { title: 'Run', path: '/run', icon: <FolderOpen size={19} strokeWidth={1.75} /> },
  { title: 'Connect', path: '/connect', icon: <Users size={19} strokeWidth={1.75} /> },
  { title: 'Analytics', path: '/analytics', icon: <BarChart3 size={19} strokeWidth={1.75} /> },
  { title: 'Agreements', path: '/contracts', icon: <FileSignature size={19} strokeWidth={1.75} />, prefix: true },
  { title: 'New agreement', path: '/contracts/new', icon: <FilePlus2 size={19} strokeWidth={1.75} /> },
];

const funderNav: NavItem[] = [
  { title: 'SMEs', path: '/', icon: <Landmark size={19} strokeWidth={1.75} /> },
  { title: 'Payment plans', path: '/funder/plans', icon: <ListChecks size={19} strokeWidth={1.75} /> },
];

const secondaryNav: NavItem[] = [
  { title: 'Verification', path: '/verification', icon: <ShieldCheck size={19} strokeWidth={1.75} /> },
  { title: 'Settings', path: '/settings', icon: <Settings size={19} strokeWidth={1.75} /> },
];

const NavRow: React.FC<{ item: NavItem; open: boolean; onNavigate?: () => void }> = ({
  item,
  open,
  onNavigate,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const active = item.prefix
    ? location.pathname === item.path ||
      (location.pathname.startsWith(item.path + '/') && location.pathname !== '/contracts/new')
    : location.pathname === item.path;

  return (
    <button
      onClick={() => {
        navigate(item.path);
        onNavigate?.();
      }}
      title={!open ? item.title : undefined}
      className={cn(
        'group relative flex w-full items-center rounded-full text-[0.875rem]',
        'h-11 md:h-10',
        'transition-[box-shadow,transform,background-color,color] duration-200',
        open ? 'gap-3 px-3' : 'justify-center px-0',
        active
          ? 'neu-sm bg-surface-2 font-semibold text-ink'
          : 'text-muted hover:bg-surface-inset/50 hover:text-ink',
      )}
    >
      <span
        className={cn(
          'grid place-items-center transition-colors',
          active ? 'text-accent' : 'text-muted group-hover:text-ink',
        )}
      >
        {item.icon}
      </span>
      {open && <span className="truncate">{item.title}</span>}
      {open && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
    </button>
  );
};

const SectionLabel: React.FC<{ children: React.ReactNode; open: boolean }> = ({ children, open }) =>
  open ? (
    <span className="px-3 pb-1 pt-2 text-[0.625rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint">
      {children}
    </span>
  ) : (
    <span className="mx-auto my-2 h-px w-5 bg-hairline" />
  );

export const Sidebar: React.FC<SidebarProps> = ({ width, collapsedWidth }) => {
  const desktopOpen = useAppStore((s) => s.sidebarOpen);
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const businessName = useAppStore((s) => s.profile?.businessName || 'My business');
  const logoDataUrl = useAppStore((s) => s.profile?.logoDataUrl || null);
  const verificationStatus = useAppStore((s) => s.profile?.verificationStatus || 'unverified');
  const accountType = useAppStore((s) => s.profile?.accountType);
  const mainNav = accountType === 'funder' ? funderNav : businessNav;
  const navigate = useNavigate();
  const location = useLocation();

  const [isDesktop, setIsDesktop] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  );

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Close the mobile drawer whenever the route changes.
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  // Lock body scroll while the mobile drawer is open.
  React.useEffect(() => {
    if (mobileNavOpen && !isDesktop) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileNavOpen, isDesktop]);

  // Close on Escape.
  React.useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, setMobileNavOpen]);

  // On mobile the drawer is always full-width labels; on desktop it collapses.
  const open = isDesktop ? desktopOpen : true;
  const closeMobile = () => setMobileNavOpen(false);


  return (
    <>
      {/* Mobile scrim */}
      <div
        onClick={closeMobile}
        aria-hidden={!mobileNavOpen}
        className={cn(
          'fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 md:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <aside
        role={!isDesktop ? 'dialog' : undefined}
        aria-modal={!isDesktop && mobileNavOpen ? true : undefined}
        aria-label="Main navigation"
        /* Keep the off-screen drawer out of the tab order and a11y tree on mobile. */
        inert={!isDesktop && !mobileNavOpen}
        className={cn(
          'glass fixed inset-y-0 left-0 z-40 flex flex-col rounded-none border-y-0 border-l-0',
          'transition-[width,transform] duration-300 ease-out',
          'md:z-30 md:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{ width: isDesktop ? (desktopOpen ? width : collapsedWidth) : DRAWER_WIDTH_MOBILE }}
      >
        {/* Wordmark */}
        <div className={cn('flex items-center gap-2.5 px-5 pb-6 pt-7', !open && 'justify-center px-0')}>
          <img
            src={`${import.meta.env.BASE_URL}brandmark.png`}
            alt="PLEXUS"
            className="h-9 w-9 shrink-0 object-contain"
          />
          {open && (
            <div className="flex flex-col leading-none">
              <span className="text-[1.25rem] font-bold tracking-[-0.02em] text-ink">PLEXUS</span>
              {accountType === 'funder' && (
                <span className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint">
                  Funder workspace
                </span>
              )}
            </div>
          )}
          {/* Close button — mobile only */}
          <button
            onClick={closeMobile}
            aria-label="Close navigation"
            className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-inset/60 hover:text-ink md:hidden"
          >
            <X size={19} strokeWidth={1.75} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="plexus-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3">
          <SectionLabel open={open}>{accountType === 'funder' ? 'Funding' : 'Menu'}</SectionLabel>
          {mainNav.map((item) => (
            <NavRow key={item.path} item={item} open={open} onNavigate={closeMobile} />
          ))}

          <div className="mt-4 flex flex-col gap-1">
            <SectionLabel open={open}>General</SectionLabel>
            {secondaryNav.map((item) => (
              <NavRow key={item.path} item={item} open={open} onNavigate={closeMobile} />
            ))}
          </div>
        </nav>

        {/* Account card */}
        <div
          className={cn('mt-auto p-3', !open && 'px-2')}
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          <button
            onClick={() => {
              navigate('/verification');
              closeMobile();
            }}
            className={cn(
              'flex w-full items-center rounded-[16px] bg-surface-inset/60 text-left transition-colors hover:bg-surface-inset',
              open ? 'gap-3 p-2.5' : 'justify-center p-2',
            )}
            title={!open ? businessName : undefined}
          >
            <BusinessAvatar name={businessName} logoDataUrl={logoDataUrl} size={36} rounded="rounded-full" />
            {open && (
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[0.8125rem] font-semibold text-ink">{businessName}</p>
                <p className="truncate text-[0.6875rem] text-muted">
                  {verificationStatus === 'verified'
                    ? 'Verified business'
                    : verificationStatus === 'pending'
                      ? 'Verification submitted'
                      : 'Not yet verified'}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
