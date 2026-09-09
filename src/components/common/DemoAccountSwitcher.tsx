import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Check, Loader2, FlaskConical } from 'lucide-react';
import { Tile, Button, Label } from '../ui';
import { useAppStore } from '../../stores/appStore';
import { signIn, signOut } from '../../services/auth';
import { DEMO_ACCOUNTS, demoAccountFor, pairedDemoAccount, type DemoAccount } from '../../lib/demo';

/**
 * Settings → Developer: jump between the public demo accounts without
 * retyping credentials (business ↔ funder in one click, buyer listed too).
 * Renders nothing unless the signed-in user IS a demo account, and can only
 * sign into another demo account — it is inert for real users.
 */
export const DemoAccountSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState<DemoAccount | null>(null);

  const current = demoAccountFor(user?.email);
  if (!current) return null;
  const target = pairedDemoAccount(current);

  const jump = async (to: DemoAccount) => {
    if (busy || to.key === current.key) return;
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

  return (
    <Tile className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>Developer · demo accounts</Label>
        <span className="inline-flex items-center gap-1 text-[0.75rem] text-muted">
          <FlaskConical className="h-3.5 w-3.5" /> Only shown while signed in as a demo account
        </span>
      </div>

      <ul className="divide-y divide-hairline">
        {DEMO_ACCOUNTS.map((a) => {
          const isCurrent = a.key === current.key;
          const isBusy = busy?.key === a.key;
          return (
            <li key={a.key} className="flex flex-wrap items-center gap-3 py-2.5">
              <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + (isCurrent ? 'bg-positive/15 text-positive' : 'bg-surface-inset text-muted')}>
                {isCurrent ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <ArrowLeftRight className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.875rem] font-semibold text-ink">
                  {a.business} <span className="font-normal text-muted">· {a.role}</span>
                  {isCurrent && <span className="ml-2 rounded-full bg-positive/15 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-positive">Signed in</span>}
                </p>
                <p className="truncate text-[0.75rem] text-muted">{a.email}</p>
              </div>
              {!isCurrent && (
                <Button
                  variant={a.key === target.key ? 'accent' : 'soft'}
                  disabled={Boolean(busy)}
                  onClick={() => jump(a)}
                  title={`Sign out of ${current.business} and into ${a.business}`}
                >
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />}
                  {isBusy ? 'Switching…' : `Switch to ${a.role}`}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-[0.75rem] text-muted">
        Same credentials as the README. Switching signs this session out and straight into the chosen account; the server's
        rules apply to whichever account is active.
      </p>
    </Tile>
  );
};

export default DemoAccountSwitcher;
