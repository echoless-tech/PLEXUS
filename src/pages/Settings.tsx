import React, { useState } from 'react';
import { Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { PageHeader, Tile, Button, Label } from '../components/ui';
import { VerificationBadge } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { updateBusinessName } from '../services/profile';
import { signOut } from '../services/auth';
import { ACCENT_THEME_LIST } from '../theme/accents';
import { fmtDate } from '../lib/format';

const Settings: React.FC = () => {
  const profile = useAppStore((s) => s.profile);
  const user = useAppStore((s) => s.user);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accentTheme = useAppStore((s) => s.accentTheme);
  const setAccentTheme = useAppStore((s) => s.setAccentTheme);
  const loadIdentity = useAppStore((s) => s.loadIdentity);
  const showToast = useAppStore((s) => s.showToast);

  const [name, setName] = useState(profile?.businessName || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return showToast('Business name cannot be empty.', 'error');
    setBusy(true);
    try {
      await updateBusinessName(name);
      await loadIdentity();
      showToast('Business name updated.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Could not update.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Workspace" title="Settings" />

      <Tile className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>Business</Label>
          {profile && <VerificationBadge status={profile.verificationStatus} />}
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-medium text-muted">Display name (shown to counterparties)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none"
          />
        </label>
        <div className="grid gap-2 text-[0.8125rem] text-muted sm:grid-cols-2">
          <p>Sign-in email: <span className="text-ink">{user?.email}</span></p>
          <p>Email verified: <span className="text-ink">{user?.emailVerified ? 'Yes' : 'Not yet'}</span></p>
          <p>Member since: <span className="text-ink">{fmtDate(profile?.createdAt)}</span></p>
          <p>Account ID: <span className="font-mono text-[0.75rem] text-ink">{user?.uid.slice(0, 12)}…</span></p>
        </div>
        <div className="flex justify-end">
          <Button variant="solid" onClick={save} disabled={busy || name.trim() === profile?.businessName}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
          </Button>
        </div>
      </Tile>

      <Tile className="gap-4">
        <Label>Appearance</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="soft" onClick={toggleDarkMode}>
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {darkMode ? 'Light mode' : 'Dark mode'}
          </Button>
          <div className="ml-auto flex items-center gap-2">
            {ACCENT_THEME_LIST.map((t) => (
              <button
                key={t.key}
                onClick={() => setAccentTheme(t.key)}
                title={t.label}
                aria-label={t.label}
                className={'h-7 w-7 rounded-full transition-transform ' + (accentTheme === t.key ? 'scale-110 ring-2 ring-ink/40 ring-offset-2 ring-offset-canvas' : '')}
                style={{ background: darkMode ? t.dark.accent : t.light.accent }}
              />
            ))}
          </div>
        </div>
      </Tile>

      <Tile className="gap-3">
        <Label>Security</Label>
        <ul className="list-disc space-y-1 pl-5 text-[0.8125rem] text-muted">
          <li>Every agreement, approval and payment is server-timestamped and append-only.</li>
          <li>Terms lock the moment a buyer accepts; changes require a new agreement.</li>
          <li>Only your last-4 ID and account digits are stored. PLEXUS never holds funds.</li>
        </ul>
        <div className="flex justify-end">
          <Button variant="soft" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </Tile>
    </div>
  );
};

export default Settings;
