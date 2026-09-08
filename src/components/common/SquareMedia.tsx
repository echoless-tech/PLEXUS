import React, { useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/cn';

/**
 * A square media tile that fills its flex row's height: it stretches vertically
 * (self-stretch) and mirrors that height onto its width via a ResizeObserver,
 * so the result is always a square as tall as the card. Falls back to initials.
 */
export const SquareMedia: React.FC<{ src?: string | null; name: string; className?: string }> = ({ src, name, className }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const sync = () => {
      const h = el.clientHeight;
      if (h && Math.abs(parseFloat(el.style.width || '0') - h) > 1) el.style.width = `${h}px`;
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(sync);
    });
    ro.observe(el);
    sync();
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div ref={ref} className={cn('relative shrink-0 self-stretch overflow-hidden rounded-2xl bg-surface-inset', className)}>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-ink text-[1.5rem] font-bold text-canvas">{initials || 'P'}</div>
      )}
    </div>
  );
};

export default SquareMedia;
