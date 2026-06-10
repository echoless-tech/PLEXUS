import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  MessageCircle,
  Package,
  Receipt,
  Wallet,
  Truck,
  Store,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/cn';

interface SidebarProps {
  width: number;
  collapsedWidth: number;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

const mainNav: NavItem[] = [
  { title: 'Dashboard', path: '/', icon: <LayoutDashboard size={19} strokeWidth={1.75} /> },
  { title: 'AI Hub', path: '/ai', icon: <Sparkles size={19} strokeWidth={1.75} /> },
  { title: 'Inventory', path: '/inventory', icon: <Package size={19} strokeWidth={1.75} /> },
  { title: 'Sales', path: '/sales', icon: <Receipt size={19} strokeWidth={1.75} /> },
  { title: 'Cash Flow', path: '/cashflow', icon: <Wallet size={19} strokeWidth={1.75} /> },
  { title: 'Suppliers', path: '/suppliers', icon: <Truck size={19} strokeWidth={1.75} /> },
  { title: 'Storefront', path: '/storefront', icon: <Store size={19} strokeWidth={1.75} /> },
  { title: 'AI Coach', path: '/coach', icon: <MessageCircle size={19} strokeWidth={1.75} /> },
];

const secondaryNav: NavItem[] = [
  { title: 'Settings', path: '/settings', icon: <Settings size={19} strokeWidth={1.75} /> },
  { title: 'Help', path: '/help', icon: <LifeBuoy size={19} strokeWidth={1.75} /> },
];

const NavRow: React.FC<{ item: NavItem; open: boolean }> = ({ item, open }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const active = location.pathname === item.path;

  return (
    <button
      onClick={() => navigate(item.path)}
      title={!open ? item.title : undefined}
      className={cn(
        'group relative flex h-10 w-full items-center rounded-full text-[0.875rem]',
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
  const open = useAppStore((s) => s.sidebarOpen);
  const businessName = useAppStore((s) => s.businessProfile.name);
  const navigate = useNavigate();

  const initials = businessName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside
      className="glass fixed inset-y-0 left-0 z-30 hidden flex-col rounded-none border-y-0 border-l-0 transition-[width] duration-300 ease-out md:flex"
      style={{ width: open ? width : collapsedWidth }}
    >
      {/* Wordmark */}
      <div className={cn('flex items-center gap-2.5 px-5 pb-6 pt-7', !open && 'justify-center px-0')}>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-ink text-[1.05rem] font-bold text-canvas">
          N
        </div>
        {open && (
          <div className="flex flex-col leading-none">
            <span className="text-[1.25rem] font-bold tracking-[-0.02em] text-ink">NODAL</span>
            <span className="mt-1 text-[0.625rem] font-semibold uppercase tracking-[var(--tracking-label)] text-faint">
              SME Intelligence
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3">
        <SectionLabel open={open}>Menu</SectionLabel>
        {mainNav.map((item) => (
          <NavRow key={item.path} item={item} open={open} />
        ))}

        <div className="mt-4 flex flex-col gap-1">
          <SectionLabel open={open}>General</SectionLabel>
          {secondaryNav.map((item) => (
            <NavRow key={item.path} item={item} open={open} />
          ))}
        </div>
      </nav>

      {/* Account card */}
      <div className={cn('mt-auto p-3', !open && 'px-2')}>
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex w-full items-center rounded-[16px] bg-surface-inset/60 text-left transition-colors hover:bg-surface-inset',
            open ? 'gap-3 p-2.5' : 'justify-center p-2',
          )}
          title={!open ? businessName : undefined}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[0.8125rem] font-bold text-canvas">
            {initials || 'N'}
          </span>
          {open && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[0.8125rem] font-semibold text-ink">{businessName}</p>
              <p className="truncate text-[0.6875rem] text-muted">Owner · Admin</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
