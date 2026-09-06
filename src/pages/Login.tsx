import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, Store, ShieldCheck, FileSignature, Receipt, Building2, Landmark } from 'lucide-react';
import { SegmentTabs, Button, Toaster } from '../components/ui';
import { signIn, signUp, resetPassword, authErrorMessage, MIN_PASSWORD_LENGTH } from '../services/auth';
import { useAppStore, setPendingAccountType } from '../stores/appStore';
import type { AccountType } from '../types';

/**
 * Sign-in / create-account. Email + password only — payment rails are not
 * identity providers, so there is deliberately no "sign in with PayShap".
 */
const Login: React.FC = () => {
  const showToast = useAppStore((s) => s.showToast);
  const [mode, setMode] = useState(0); // 0 = sign in, 1 = create account
  const [accountType, setAccountType] = useState<AccountType>('business');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!email.trim() || !password) return setError('Enter your email and password.');
    if (isSignup && !businessName.trim()) return setError('Enter your business name.');
    if (isSignup && password.length < MIN_PASSWORD_LENGTH)
      return setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`);

    setBusy(true);
    try {
      if (isSignup) {
        setPendingAccountType(accountType);
        await signUp(email, password, businessName);
      } else await signIn(email, password);
    } catch (err) {
      setPendingAccountType(null);
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Enter your email above first, then tap "Forgot password".');
    try {
      await resetPassword(email);
      showToast(`Password reset email sent to ${email.trim()}`, 'success');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="plexus-root flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="animate-rise w-full max-w-[26rem]">
        <div className="mb-7 text-center">
          <p className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]">
            PLEXUS<span className="text-accent">.</span>
          </p>
          <p className="mt-2 text-[0.875rem] text-muted">Get paid as the work progresses.</p>
        </div>

        <div className="glass-strong rounded-[28px] p-6 sm:p-8">
          <SegmentTabs
            tabs={['Sign in', 'Create account']}
            value={mode}
            onChange={(i) => {
              setMode(i);
              setError(null);
            }}
            className="mb-6 w-full [&>button]:flex-1"
          />

          <form onSubmit={submit} className="flex flex-col gap-3.5">
            {isSignup && (
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
                {(
                  [
                    { t: 'business', label: 'I run a business', Icon: Building2 },
                    { t: 'funder', label: 'I am a funder', Icon: Landmark },
                  ] as const
                ).map(({ t, label, Icon }) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={accountType === t}
                    onClick={() => setAccountType(t)}
                    className={
                      'flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[0.8125rem] font-semibold transition-colors ' +
                      (accountType === t ? 'bg-ink text-canvas' : 'bg-surface-inset/60 text-muted hover:text-ink')
                    }
                  >
                    <Icon className="h-4 w-4" /> {label}
                  </button>
                ))}
              </div>
            )}
            {isSignup && (
              <Field
                icon={<Store className="h-4 w-4 shrink-0 text-faint" />}
                type="text"
                placeholder={accountType === 'funder' ? 'Fund / institution name' : 'Business name'}
                value={businessName}
                onChange={setBusinessName}
                autoComplete="organization"
              />
            )}
            <Field
              icon={<Mail className="h-4 w-4 shrink-0 text-faint" />}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              icon={<Lock className="h-4 w-4 shrink-0 text-faint" />}
              type={showPassword ? 'text' : 'password'}
              placeholder={isSignup ? `Password (min ${MIN_PASSWORD_LENGTH} characters)` : 'Password'}
              value={password}
              onChange={setPassword}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="grid place-items-center text-faint transition-colors hover:text-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />

            {error && (
              <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{error}</p>
            )}

            <Button type="submit" variant="accent" disabled={busy} className="mt-1 py-2.5">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSignup ? 'Creating your account…' : 'Signing in…'}
                </>
              ) : isSignup ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          {!isSignup && (
            <button
              type="button"
              onClick={forgot}
              className="mt-4 w-full text-center text-[0.8125rem] font-medium text-muted transition-colors hover:text-ink"
            >
              Forgot password?
            </button>
          )}
        </div>

        <ul className="mt-6 grid grid-cols-3 gap-2 text-center text-[0.6875rem] leading-snug text-faint">
          <li className="flex flex-col items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-muted" />
            Verified parties
          </li>
          <li className="flex flex-col items-center gap-1.5">
            <FileSignature className="h-4 w-4 text-muted" />
            Terms locked on acceptance
          </li>
          <li className="flex flex-col items-center gap-1.5">
            <Receipt className="h-4 w-4 text-muted" />
            Full audit trail
          </li>
        </ul>
      </div>
      <Toaster />
    </div>
  );
};

const Field: React.FC<{
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  trailing?: React.ReactNode;
}> = ({ icon, type, placeholder, value, onChange, autoComplete, trailing }) => (
  <div className="flex items-center gap-2.5 rounded-full bg-surface-inset/60 px-4 py-2.5 transition-colors focus-within:bg-surface-inset">
    {icon}
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      className="w-full bg-transparent text-[0.875rem] text-ink placeholder:text-faint focus:outline-none"
    />
    {trailing}
  </div>
);

export default Login;
