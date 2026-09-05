import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Info } from 'lucide-react';
import { PageHeader, Tile, Button, Label } from '../components/ui';
import { VerificationBadge } from '../components/common';
import { useAppStore } from '../stores/appStore';
import { submitVerification, type VerificationInput } from '../services/profile';
import { fmtDateTime } from '../lib/format';

const EMPTY: VerificationInput = {
  legalName: '',
  tradingName: '',
  registrationNumber: '',
  taxNumber: '',
  ownerFullName: '',
  ownerIdLast4: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  accountHolder: '',
  accountNumberLast4: '',
};

/**
 * Business verification. Only a KYC *summary* is captured here and only the
 * last four digits of identity / bank numbers are ever stored. Full document
 * checks run with the regulated verification partner; the platform then
 * flips the status to "verified" server-side — a client can never do that.
 */
const Verification: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const verification = useAppStore((s) => s.verification);
  const user = useAppStore((s) => s.user);
  const loadIdentity = useAppStore((s) => s.loadIdentity);
  const showToast = useAppStore((s) => s.showToast);

  const [form, setForm] = useState<VerificationInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (verification) {
      const { status: _s, submittedAt: _a, updatedAt: _u, ...rest } = verification;
      setForm(rest);
    } else {
      setForm((f) => ({
        ...f,
        tradingName: f.tradingName || profile?.businessName || '',
        email: f.email || user?.email || '',
      }));
    }
  }, [verification, profile, user]);

  const set = (k: keyof VerificationInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.legalName.trim()) return setError('Enter the registered / legal business name.');
    if (!form.ownerFullName.trim()) return setError("Enter the owner or director's full name.");
    if (!/^\d{4}$/.test(form.ownerIdLast4)) return setError('Enter the last 4 digits of the owner ID number.');
    if (!/^\d{4}$/.test(form.accountNumberLast4)) return setError('Enter the last 4 digits of the business bank account.');
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return setError('That contact email looks invalid.');

    setBusy(true);
    try {
      await submitVerification(form);
      await loadIdentity();
      showToast('Verification submitted. You can now create and accept agreements.', 'success');
      navigate('/contracts');
    } catch (err: any) {
      setError(err?.message || 'Could not submit verification.');
    } finally {
      setBusy(false);
    }
  };

  const status = profile?.verificationStatus || 'unverified';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Trust"
        title="Business verification"
        subtitle="Both parties to a payment agreement must verify who they are. Buyers see your verification status before they accept."
        actions={<VerificationBadge status={status} />}
      />

      <Tile className="gap-3 bg-accent-soft/40">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-[0.8125rem] leading-relaxed text-muted">
            We store only a <strong className="text-ink">summary</strong> here — never full ID or account numbers. Full FICA
            document checks are completed with our regulated verification partner, after which your account is marked{' '}
            <strong className="text-ink">Verified</strong>. That step cannot be self-granted.
          </p>
        </div>
        {verification?.submittedAt && (
          <p className="text-[0.75rem] text-faint">Last submitted {fmtDateTime(verification.submittedAt)}</p>
        )}
      </Tile>

      <form onSubmit={submit} className="space-y-5">
        <Tile className="gap-4">
          <Label>Business</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Registered / legal name *" value={form.legalName} onChange={set('legalName')} maxLength={160} />
            <Input label="Trading name" value={form.tradingName} onChange={set('tradingName')} maxLength={160} />
            <Input label="CIPC registration no." value={form.registrationNumber} onChange={set('registrationNumber')} maxLength={40} placeholder="2019/123456/07" />
            <Input label="SARS tax reference" value={form.taxNumber} onChange={set('taxNumber')} maxLength={40} />
            <Input label="Contact phone" value={form.phone} onChange={set('phone')} maxLength={32} type="tel" />
            <Input label="Contact email" value={form.email} onChange={set('email')} maxLength={254} type="email" />
          </div>
          <Input label="Business address" value={form.address} onChange={set('address')} maxLength={300} />
        </Tile>

        <Tile className="gap-4">
          <Label>Owner / director</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Full name *" value={form.ownerFullName} onChange={set('ownerFullName')} maxLength={160} />
            <Input
              label="SA ID — last 4 digits only *"
              value={form.ownerIdLast4}
              onChange={(e) => setForm((f) => ({ ...f, ownerIdLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              inputMode="numeric"
              placeholder="••••"
            />
          </div>
        </Tile>

        <Tile className="gap-4">
          <Label>Settlement account</Label>
          <p className="-mt-2 text-[0.75rem] text-faint">
            Used to confirm the account you will be paid into matches your business. Full details are shared per agreement.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input label="Bank" value={form.bankName} onChange={set('bankName')} maxLength={64} />
            <Input label="Account holder" value={form.accountHolder} onChange={set('accountHolder')} maxLength={120} />
            <Input
              label="Account — last 4 digits *"
              value={form.accountNumberLast4}
              onChange={(e) => setForm((f) => ({ ...f, accountNumberLast4: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
              maxLength={4}
              inputMode="numeric"
              placeholder="••••"
            />
          </div>
        </Tile>

        {error && (
          <p className="rounded-2xl bg-negative/10 px-4 py-2.5 text-[0.8125rem] font-medium text-negative">{error}</p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {verification ? 'Update verification' : 'Submit for verification'}
          </Button>
        </div>
      </form>
    </div>
  );
};

const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label: string }
> = ({ label, className, ...rest }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-[0.75rem] font-medium text-muted">{label}</span>
    <input
      {...rest}
      className={
        'w-full rounded-2xl bg-surface-inset/60 px-3.5 py-2.5 text-[0.875rem] text-ink placeholder:text-faint focus:bg-surface-inset focus:outline-none ' +
        (className || '')
      }
    />
  </label>
);

export default Verification;
