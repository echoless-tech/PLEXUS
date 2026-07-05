import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, Store } from 'lucide-react';
import { SegmentTabs, Button, Toaster } from '../components/ui';
import { signIn, signUp, resetPassword, authErrorMessage } from '../services/auth';
import { useAppStore } from '../stores/appStore';

/**
 * Full-screen sign-in / create-account screen.
 * Rendered instead of the AppShell whenever there is no authenticated user —
 * auth state flows through the store, so a successful sign-in swaps the UI
 * automatically.
 */
const Login: React.FC = () => {
  const showToast = useAppStore((s) => s.showToast);
  const [mode, setMode] = useState(0); // 0 = sign in, 1 = create account
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

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    if (isSignup && !businessName.trim()) {
      setError('Enter your business name.');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        await signUp(email, password, businessName);
      } else {
        await signIn(email, password);
      }
      // onAuthStateChanged → setAuthUser → app swaps to the shell.
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password".');
      return;
    }
    try {
      await resetPassword(email);
      showToast(`Password reset email sent to ${email.trim()}`, 'success');
    } catch (err) {
      setError(authErrorMessage(err));
    }
  };

  return (
    <div className="nodal-root flex min-h-screen items-center justify-center bg-canvas px-4 py-10 text-ink">
      <div className="animate-rise w-full max-w-[26rem]">
        {/* Wordmark */}
        <div className="mb-7 text-center">
          <p className="text-[2rem] font-extrabold leading-none tracking-[-0.03em]">
            NODAL<span className="text-accent">.</span>
          </p>
          <p className="mt-2 text-[0.875rem] text-muted">
            Your business, one node at a time
          </p>
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
              <Field
                icon={<Store className="h-4 w-4 shrink-0 text-faint" />}
                type="text"
                placeholder="Business name"
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
              placeholder={isSignup ? 'Password (min 6 characters)' : 'Password'}
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
              <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">
                {error}
              </p>
            )}

            <Button type="submit" variant="accent" disabled={busy} className="mt-1 py-2.5">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isSignup ? 'Creating your workspace…' : 'Signing in…'}
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

          {isSignup && (
            <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-faint">
              Your workspace starts with sample data so you can explore
              every screen — replace it with your own as you go.
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-[0.75rem] text-faint">
          Data is stored securely in the cloud and synced across your devices.
        </p>
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
