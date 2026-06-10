import React from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Stroke color — defaults to the current text color (quiet). */
  stroke?: string;
  strokeWidth?: number;
  /** Subtle area fill beneath the line. */
  fill?: string;
  /** Emphasize the final point with a small dot. */
  showEndDot?: boolean;
  className?: string;
}

/**
 * Minimalist sparkline. No axes, no grid, no tooltip — a quiet trace of shape.
 * Renders as inline SVG with a vector-effect non-scaling stroke so it stays
 * crisp at any container width.
 */
export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 36,
  stroke = 'currentColor',
  strokeWidth = 1.5,
  fill,
  showEndDot = true,
  className,
}) => {
  if (!data || data.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden />;
  }

  const pad = strokeWidth + 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (width - pad * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const [endX, endY] = points[points.length - 1];

  const areaPath = fill
    ? `${line} L${endX.toFixed(2)},${(height - pad).toFixed(2)} L${pad.toFixed(2)},${(height - pad).toFixed(2)} Z`
    : '';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      {fill && <path d={areaPath} fill={fill} stroke="none" />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      {showEndDot && <circle cx={endX} cy={endY} r={strokeWidth + 0.5} fill={stroke} />}
    </svg>
  );
};
