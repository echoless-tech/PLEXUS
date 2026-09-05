import { LIMITS } from '../types';

export const zar = (amount: number, cents = true) =>
  new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(amount);

export const fmtDate = (d: Date | string | null | undefined) => {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d.length === 10 ? `${d}T00:00:00` : d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const fmtDateTime = (d: Date | null | undefined) => {
  if (!d) return '—';
  return d.toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Round to cents so schedule maths never drifts by floating-point noise. */
export const cents = (n: number) => Math.round(n * 100) / 100;

export const isValidEmail = (v: string) =>
  v.length >= 5 && v.length <= LIMITS.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export const clampStr = (v: string, max: number) => v.slice(0, max);

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const shortId = (id: string) => id.replace(/-/g, '').slice(0, 6).toUpperCase();

/** Human-readable payment reference the buyer puts on the bank transfer. */
export const paymentReferenceFor = (contractId: string, milestoneOrder: number) =>
  `PLX-${shortId(contractId)}-M${milestoneOrder + 1}`;

export const maskAccount = (acc?: string) =>
  acc && acc.length > 4 ? `•••• ${acc.slice(-4)}` : acc || '—';
