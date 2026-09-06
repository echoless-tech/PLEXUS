import React from 'react';
import { cn } from '../../lib/cn';

/** Logo if the business uploaded one, otherwise initials on an ink tile. */
export const BusinessAvatar: React.FC<{
  name: string;
  logoDataUrl?: string | null;
  size?: number;
  className?: string;
  rounded?: string;
}> = ({ name, logoDataUrl, size = 40, className, rounded = 'rounded-2xl' }) => {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.34) };
  if (logoDataUrl) {
    return (
      <img
        src={logoDataUrl}
        alt=""
        style={style}
        className={cn('shrink-0 object-cover bg-surface-inset', rounded, className)}
      />
    );
  }
  return (
    <span
      style={style}
      className={cn('grid shrink-0 place-items-center bg-ink font-bold text-canvas', rounded, className)}
    >
      {initials || 'P'}
    </span>
  );
};

export default BusinessAvatar;
