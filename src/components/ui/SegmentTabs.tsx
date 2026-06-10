import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

interface SegmentTabsProps {
  tabs: string[];
  value: number;
  onChange: (index: number) => void;
  className?: string;
}

/** Low-contrast segmented control — an elevated indicator slides to the active segment. */
export const SegmentTabs: React.FC<SegmentTabsProps> = ({ tabs, value, onChange, className }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const measure = () => {
    const btn = btnRefs.current[value];
    const list = listRef.current;
    if (!btn || !list) return;
    setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, tabs.length]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div
      ref={listRef}
      className={cn('relative inline-flex items-center gap-1 rounded-full bg-surface-inset/60 p-1', className)}
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        className="neu-sm absolute top-1 bottom-1 rounded-full bg-surface"
        style={{
          left: indicator.left,
          width: indicator.width,
          transition: 'left 0.32s cubic-bezier(0.22, 1, 0.36, 1), width 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
      {tabs.map((tab, i) => (
        <button
          key={tab}
          ref={(el) => {
            btnRefs.current[i] = el;
          }}
          onClick={() => onChange(i)}
          className={cn(
            'relative z-10 rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors duration-200',
            value === i ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
