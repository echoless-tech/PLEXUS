import React, { useState } from 'react';
import { Building2, Landmark, Loader2, ArrowRight, Lock } from 'lucide-react';
import { Toaster } from '../components/ui';
import { useAppStore } from '../stores/appStore';
import { signOut } from '../services/auth';
import type { AccountType } from '../types';

/**
 * Shown once, right after sign-in, to any account that has not yet declared
 * whether it is a business or a funder. The choice is write-once in the
 * security rules, so it is presented as a deliberate decision.
 */
const ChooseAccountType: React.FC = () => {
  const chooseAccountType = useAppStore((s) => s.chooseAccountType);
  const profile = useAppStore((s) => s.profile);
  const showToast = useAppStore((s) => s.showToast);
  const [picked, setPicked] = useState<AccountType | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    try {
      await chooseAccountType(picked);
    } catch (e: any) {
      showToast(e?.message || 'Could not save your choice.', 'error');
      setBusy(false);
    }
  };

  return (
    <div className="plexus-root flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="animate-rise w-full max-w-2xl">
        <div className="mb-8 text-center">
          <p className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]">
            PLEXUS<span className="text-accent">.</span>
          </p>
          <h1 className="mt-5 text-[1.5rem] font-bold tracking-[-0.02em]">
            Welcome{profile?.businessName ? `, ${profile.businessName}` : ''}. How will you use PLEXUS?
          </h1>
          <p className="mt-2 text-[0.875rem] text-muted">This sets up your workspace and cannot be changed later.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Option
            active={picked === 'business'}
            onClick={() => setPicked('business')}
            icon={<Building2 className="h-6 w-6" />}
            title="I run a business"
            body="Create progressive payment agreements with buyers, get paid as work progresses, upload records that show performance, and connect with other businesses."
            bullets={['Run · Connect · Analytics', 'Payment agreements & milestones', 'Optionally list plans for funders']}
          />
          <Option
            active={picked === 'funder'}
            onClick={() => setPicked('funder')}
            icon={<Landmark className="h-6 w-6" />}
            title="I am a funder"
            body="Browse verified SMEs with ratings and analytics, see the payment plans they have listed for funding, and follow buyer-confirmed progress on each stage."
            bullets={['SME directory with ratings', 'Listed payment plans', 'Read-only, audit-backed view']}
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => signOut()} className="text-[0.8125rem] text-muted hover:text-ink">
            Sign out
          </button>
          <button
            onClick={confirm}
            disabled={!picked || busy}
            className="neu inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[0.875rem] font-semibold text-accent-contrast transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue as {picked === 'funder' ? 'a funder' : picked === 'business' ? 'a business' : '…'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[0.75rem] text-faint">
          <Lock className="h-3.5 w-3.5" /> Both account types must complete business verification before operating on the platform.
        </p>
      </div>
      <Toaster />
    </div>
  );
};

const Option: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  body: string;
  bullets: string[];
}> = ({ active, onClick, icon, title, body, bullets }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={
      'glass-strong flex flex-col items-start gap-3 rounded-[24px] p-6 text-left transition-all ' +
      (active ? 'ring-2 ring-accent' : 'hover:-translate-y-0.5')
    }
  >
    <span className={'grid h-12 w-12 place-items-center rounded-2xl ' + (active ? 'bg-accent text-accent-contrast' : 'bg-accent-soft text-accent')}>
      {icon}
    </span>
    <span className="text-[1.0625rem] font-bold text-ink">{title}</span>
    <span className="text-[0.8125rem] leading-relaxed text-muted">{body}</span>
    <ul className="mt-1 space-y-1">
      {bullets.map((b) => (
        <li key={b} className="flex items-center gap-2 text-[0.75rem] text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {b}
        </li>
      ))}
    </ul>
  </button>
);

export default ChooseAccountType;
