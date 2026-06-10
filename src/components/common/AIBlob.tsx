import React from 'react';
import { cn } from '../../lib/cn';

export type BlobState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface AIBlobProps {
  /** Diameter in pixels. */
  size?: number;
  /** Drives animation speed / intensity. Behaviour to be expanded later. */
  state?: BlobState;
  className?: string;
}

/** Speed multipliers per state — lower = faster. */
const SPEED: Record<BlobState, { morph: number; spin: number; breathe: number }> = {
  idle: { morph: 9, spin: 26, breathe: 6 },
  listening: { morph: 5, spin: 16, breathe: 3.2 },
  thinking: { morph: 3, spin: 9, breathe: 2 },
  speaking: { morph: 2.2, spin: 12, breathe: 1.4 },
};

/**
 * A beautiful Siri-like animated blob.
 *
 * Layered gradient orbs morph, drift and counter-rotate behind a frosted
 * core with a soft outer glow. Colours follow the active accent so it
 * recolours with the selected theme. Purely presentational for now —
 * interaction behaviour will be wired up next.
 */
export const AIBlob: React.FC<AIBlobProps> = ({ size = 220, state = 'idle', className }) => {
  const speed = SPEED[state];

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="NODAL AI"
    >
      {/* Outer ambient glow — sits behind, soft and wide */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: '92%',
          height: '92%',
          background:
            'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--accent) 50%, transparent), transparent 68%)',
          filter: `blur(${size * 0.06}px)`,
          animation: `blob-glow ${speed.breathe * 1.5}s ease-in-out infinite`,
        }}
      />

      {/* Breathing stage — kept at 72% so growth never reaches the edge */}
      <div
        className="relative"
        style={{
          width: '72%',
          height: '72%',
          animation: `blob-breathe ${speed.breathe}s ease-in-out infinite`,
        }}
      >
        {/* Base morphing body */}
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '42% 58% 63% 37% / 41% 44% 56% 59%',
            background:
              'radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 92%, white), var(--accent) 55%, color-mix(in srgb, var(--accent) 70%, #6d5ce0) 100%)',
            animation: `blob-morph ${speed.morph}s ease-in-out infinite, blob-spin ${speed.spin}s linear infinite`,
            filter: `blur(${size * 0.012}px)`,
          }}
        />

        {/* Floating teal/positive lobe */}
        <div
          className="absolute"
          style={{
            inset: '8%',
            borderRadius: '62% 38% 41% 59% / 58% 63% 37% 42%',
            background:
              'radial-gradient(circle at 65% 70%, color-mix(in srgb, var(--positive) 90%, transparent), transparent 60%)',
            mixBlendMode: 'screen',
            filter: `blur(${size * 0.03}px)`,
            animation: `blob-drift-a ${speed.morph * 1.3}s ease-in-out infinite`,
          }}
        />

        {/* Floating violet lobe */}
        <div
          className="absolute"
          style={{
            inset: '12%',
            borderRadius: '38% 62% 56% 44% / 63% 38% 62% 37%',
            background:
              'radial-gradient(circle at 30% 65%, color-mix(in srgb, #8b95f0 85%, transparent), transparent 58%)',
            mixBlendMode: 'screen',
            filter: `blur(${size * 0.035}px)`,
            animation: `blob-drift-b ${speed.morph * 1.1}s ease-in-out infinite`,
          }}
        />

        {/* Counter-rotating sheen ring for liveliness */}
        <div
          className="absolute inset-[6%]"
          style={{
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.35), transparent 40%)',
            mixBlendMode: 'screen',
            filter: `blur(${size * 0.02}px)`,
            animation: `blob-spin-rev ${speed.spin * 0.6}s linear infinite`,
          }}
        />

        {/* Bright specular highlight */}
        <div
          className="absolute"
          style={{
            left: '24%',
            top: '18%',
            width: '30%',
            height: '24%',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.95), transparent 70%)',
            filter: `blur(${size * 0.025}px)`,
            animation: `blob-breathe ${speed.breathe * 1.2}s ease-in-out infinite`,
          }}
        />

        {/* Inner glass depth */}
        <div
          className="absolute inset-[30%] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.4), rgba(255,255,255,0.06) 60%, transparent)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
      </div>
    </div>
  );
};

export default AIBlob;
