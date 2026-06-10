import React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { cn } from '../../lib/cn';

const ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
} as const;

const TONES = {
  success: 'text-positive',
  info: 'text-accent',
  warning: 'text-accent',
  error: 'text-negative',
} as const;

/** Bottom-left stack of transient toasts. Driven by the store. */
export const Toaster: React.FC = () => {
  const toasts = useAppStore((s) => s.toasts);
  const dismissToast = useAppStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-[1400] flex flex-col gap-2.5">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="glass-strong animate-rise pointer-events-auto flex max-w-sm items-start gap-3 rounded-[16px] px-4 py-3"
          >
            <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', TONES[toast.type])} strokeWidth={2} />
            <p className="flex-1 text-[0.875rem] leading-snug text-ink">{toast.message}</p>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-surface-inset hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default Toaster;
