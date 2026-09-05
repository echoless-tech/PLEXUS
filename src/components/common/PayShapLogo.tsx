import React from 'react';

/**
 * PayShap brand mark — a rounded badge with the circular real-time-payment
 * motif. Self-contained SVG (unique gradient id) so it can be dropped anywhere.
 */
export const PayShapLogo: React.FC<{ className?: string; title?: string }> = ({
  className,
  title = 'PayShap',
}) => {
  const gid = React.useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#12C2B0" />
          <stop offset="1" stopColor="#0E9E86" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="32" height="32" rx="9" fill={`url(#${gid})`} />
      {/* Circular arrows — instant / real-time payment motif */}
      <g fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
        <path d="M22.4 12.2A8 8 0 0 0 8.6 14" />
        <path d="M9.6 19.8A8 8 0 0 0 23.4 18" />
      </g>
      <path d="M22.6 8.2l.9 4.4-4.4-.6z" fill="#FFFFFF" />
      <path d="M9.4 23.8l-.9-4.4 4.4.6z" fill="#FFFFFF" />
      {/* Rand mark in the centre */}
      <text
        x="16"
        y="20.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="800"
        fontFamily="Segoe UI, system-ui, sans-serif"
        fill="#FFFFFF"
      >
        R
      </text>
    </svg>
  );
};

export default PayShapLogo;
