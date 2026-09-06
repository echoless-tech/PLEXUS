import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LogOut, Moon, Sun, ImagePlus, Trash2 } from 'lucide-react';
import { PageHeader, Tile, Button, Label } from '../components/ui';
import { VerificationBadge, BusinessAvatar } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { updateProfileDetails, type ProfileDetailsInput } from '../services/profile';
import { signOut } from '../services/auth';
import { ACCENT_THEME_LIST } from '../theme/accents';
import { fmtDate } from '../lib/format';
import { imageToDataUrl } from '../lib/files';
import { INDUSTRY_LABELS, LIMITS, type Industry } from '../types';

const fieldCls =
  'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink focus:bg-surface-inset focus:outline-none';

const Settings: React.FC = () => {
  const profile = useAppStore((s) => s.profile);
  const user = useAppStore((s) => s.user);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const accentTheme = useAppStore((s) => s.accentTheme);
  const setAccentTheme = useAppStore((s) => s.setAccentTheme);
  const loadIdentity = useAppStore((s) => s.loadIdentity);
  const showToast = useAppStore((s) => s.showToast);

  const isFunder = profile?.accountType === 'funder';
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<ProfileDetailsInput>({
    businessName: '',
    industry: null,
    description: '',
    location: '',
    publicEmail: '',
    logoDataUrl: null,
  });
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      businessName: profile.businessName,
      industry: profile.industry,
      description: profile.description,
      location: profile.location,
      publicEmail: profile.publicEmail,
      logoDataUrl: profile.logoDataUrl,
    });
    setDirty(false);
  }, [profile]);

  const set = <K extends keyof ProfileDetailsInput>(k: K, v: ProfileDetailsInput[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      // 256px square-ish JPEG keeps well under the rule limit.
      set('logoDataUrl', await imageToDataUrl(file, 256, LIMITS.logoDataUrl));
    } catch (err: any) {
      showToast(err?.message || 'Could not read that image.', 'error');
    }
  };

  const save = async () => {
    if (!form.businessName.trim()) return showToast('Name cannot be empty.', 'error');
    if (form.publicEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.publicEmail)) return showToast('Public email looks invalid.', 'error');
    setBusy(true);
    try {
      await updateProfileDetails({ ...form, businessName: form.businessName.trim() });
      await loadIdentity();
      showToast('Profile updated.', 'success');
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
          <Label>{isFunder ? 'Funder profile' : 'Business profile'}</Label>
          {profile && <VerificationBadge status={profile.verificationStatus} />}
        </div>
        <p className="-mt-2 text-[0.75rem] text-faint">
          {isFunder
            ? 'Shown to SMEs whose payment plans you view.'
            : 'Shown to buyers, funders and other businesses on Connect. Never include bank or identity details here.'}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <BusinessAvatar name={form.businessName || 'P'} logoDataUrl={form.logoDataUrl} size={72} />
          <div className="flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> {form.logoDataUrl ? 'Change logo' : 'Upload logo'}
            </Button>
            {form.logoDataUrl && (
              <Button variant="soft" onClick={() => set('logoDataUrl', null)}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickLogo} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-muted">Display name *</span>
            <input value={form.businessName} onChange={(e) => set('businessName', e.target.value)} maxLength={120} className={fieldCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-muted">{isFunder ? 'Focus sector' : 'Industry'}</span>
            <select
              value={form.industry || ''}
              onChange={(e) => set('industry', (e.target.value || null) as Industry | null)}
              className={fieldCls}
            >
              <option value="">Not specified</option>
              {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
                <option key={k} value={k}>
                  {INDUSTRY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-muted">Location (city / province)</span>
            <input value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={120} className={fieldCls} placeholder="Durban, KZN" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-muted">Public contact email</span>
            <input
              type="email"
              value={form.publicEmail}
              onChange={(e) => set('publicEmail', e.target.value)}
              maxLength={254}
              className={fieldCls}
              placeholder="hello@yourbusiness.co.za"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.75rem] font-medium text-muted">About</span>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            maxLength={LIMITS.shortText}
            rows={3}
            className={fieldCls + ' resize-none'}
            placeholder={isFunder ? 'What you fund, typical ticket sizes, sectors…' : 'What you make or do, who you serve, capacity…'}
          />
          <span className="text-right text-[0.6875rem] text-faint">{form.description.length}/{LIMITS.shortText}</span>
        </label>

        <div className="grid gap-2 text-[0.8125rem] text-muted sm:grid-cols-2">
          <p>Sign-in email: <span className="text-ink">{user?.email}</span></p>
          <p>Account type: <span className="capitalize text-ink">{profile?.accountType || '—'}</span></p>
          <p>Member since: <span className="text-ink">{fmtDate(profile?.createdAt)}</span></p>
          <p>Account ID: <span className="font-mono text-[0.75rem] text-ink">{user?.uid.slice(0, 12)}…</span></p>
        </div>
        <div className="flex justify-end">
          <Button variant="solid" onClick={save} disabled={busy || !dirty}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save profile
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
          <li>Settlement details are visible only to the two parties — never to funders.</li>
          <li>Only your last-4 ID and account digits are stored. PLEXUS never holds funds.</li>
          <li>Your account type ({profile?.accountType || '—'}) is fixed once chosen.</li>
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
