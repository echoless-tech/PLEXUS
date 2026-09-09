import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check, ChevronDown, Loader2 } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { signIn, signOut } from '../../services/auth';
import { DEMO_ACCOUNTS, demoAccountFor, pairedDemoAccount, type DemoAccount } from '../../lib/demo';

/**
 * Dev-only convenience for the public demo accounts: one click jumps from the
 * business demo to the funder demo and back. Renders nothing unless the
 * signed-in user is one of the demo accounts, and can only sign into another
 * demo account. The small chevron opens the full list (incl. the buyer).
 */
export const DemoSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState<DemoAccount | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const current = demoAccountFor(user?.email);
  if (!current) return null;
  const target = pairedDemoAccount(current);

  const jump = async (to: DemoAccount) => {
    if (busy || to.key === current.key) return;
    setOpen(false);
    setBusy(to);
    try {
      await signOut();
      await signIn(to.email, to.password);
      navigate('/', { replace: true });
      showToast(`Switched to ${to.business} (${to.role.toLowerCase()} demo).`, 'info');
    } catch (e: any) {
      showToast(e?.message || 'Could not switch demo account.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const label = busy ? `Switching to ${busy.role}…` : `Switch to ${target.role} demo`;

  return (
    <div ref={wrapRef} className="relative flex items-center">
      <div
        className="flex items-stretch overflow-hidden rounded-full text-[0.75rem] font-semibold"
        style={{ background: 'var(--surface-inset)', color: 'var(--text)' }}
      >
        <button
          type="button"
          onClick={() => jump(target)}
          disabled={Boolean(busy)}
          title={`Dev: sign out of ${current.business} and into ${target.business} (${target.email})`}
          className="flex items-center gap-1.5 py-1.5 pl-3 pr-2.5 transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{ background: 'transparent', color: 'inherit' }}
        >
          {busy ? <Loader2 size={14} strokeWidth={2} className="animate-spin" /> : <ArrowLeftRight size={14} strokeWidth={2} />}
          <span className="hidden sm:inline">{label}</span>
          <span className="sm:hidden">{busy ? '…' : target.role}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={Boolean(busy)}
          aria-label="Choose a demo account"
          aria-expanded={open}
          className="grid place-items-center border-l border-hairline px-1.5 transition-opacity hover:opacity-80 disabled:opacity-60"
          style={{ background: 'transparent', color: 'inherit' }}
        >
          <ChevronDown size={14} strokeWidth={2} />
        </button>
      </div>

      {open && (
        <div className="glass-strong animate-rise absolute right-0 top-11 z-30 w-72 overflow-hidden rounded-[18px]">
          <p className="border-b border-hairline px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted">
            Dev · demo accounts
          </p>
          <div className="p-1.5">
            {DEMO_ACCOUNTS.map((a) => {
              const isCurrent = a.key === current.key;
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => jump(a)}
                  disabled={isCurrent}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface-inset/60 disabled:cursor-default disabled:hover:bg-transparent"
                  style={{ background: 'transparent', color: 'var(--text)' }}
                >
                  <span className="grid h-4 w-4 place-items-center">{isCurrent && <Check size={14} strokeWidth={2.5} className="text-accent" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.8125rem] font-semibold">
                      {a.business} <span className="font-normal text-muted">· {a.role}</span>
                    </span>
                    <span className="block truncate text-[0.6875rem] text-muted">{a.email}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoSwitcher;
