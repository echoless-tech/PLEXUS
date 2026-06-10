import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X, Mic, Eye } from 'lucide-react';
import { AIBlob } from './AIBlob';
import { useLiveVoice } from '../../hooks/useLiveVoice';
import { useAppStore } from '../../stores/appStore';
import { chatWithCoach, buildBusinessContext, ChatMessage } from '../../services/ai';
import { cn } from '../../lib/cn';

interface VoiceHudProps {
  open: boolean;
  onClose: () => void;
}

const PHASE_LABEL: Record<string, string> = {
  idle: 'Tap to start again',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
};

/** Map the current route to a friendly screen name for AI context. */
const PAGE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/ai': 'AI Hub',
  '/coach': 'AI Coach',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/cashflow': 'Cash Flow',
  '/suppliers': 'Suppliers',
  '/storefront': 'Storefront',
  '/settings': 'Settings',
  '/help': 'Help',
};

/** Flatten markdown to plain conversational text for speech + caption. */
const stripMarkdown = (md: string): string =>
  md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[*_~`#>]/g, '')
    .replace(/^\s*[-•]\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n{2,}/g, '\n')
    .trim();

/**
 * Full-screen voice overlay. The app-wide blob expands into this HUD,
 * runs the live STT → AI → TTS loop, and shows the live caption + reply.
 * The AI is told which screen the user opened it from.
 */
export const VoiceHud: React.FC<VoiceHudProps> = ({ open, onClose }) => {
  const { products, sales, cashFlow, businessProfile } = useAppStore();
  const location = useLocation();
  const [peek, setPeek] = useState(false);

  const pageLabel = PAGE_LABELS[location.pathname] ?? 'NODAL';

  const handleSubmit = useCallback(
    async (question: string): Promise<string> => {
      const context = buildBusinessContext({ products, sales, cashFlow, businessProfile });
      const history: ChatMessage[] = [];
      const raw = await chatWithCoach(question, history, context, pageLabel);
      return stripMarkdown(raw);
    },
    [products, sales, cashFlow, businessProfile, pageLabel],
  );

  const { phase, transcript, reply, error, supported, start, stop } = useLiveVoice({
    onSubmit: handleSubmit,
  });

  // Start listening when the HUD opens; stop when it closes.
  useEffect(() => {
    if (open) start();
    else {
      stop();
      setPeek(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stop();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    stop();
    onClose();
  };

  // Hold-to-peek: reveal what's behind the HUD while the eye button is pressed.
  const startPeek = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPeek(true);
  };
  const endPeek = () => setPeek(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000]">
      {/* Peekable layer — fades out while the eye button is held */}
      <div
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center px-6 transition-opacity duration-200',
          peek && 'pointer-events-none opacity-0',
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Dimmed, blurred backdrop — click outside to dismiss */}
        <button
          aria-label="Close voice assistant"
          onClick={close}
          className="absolute inset-0 bg-canvas/70 backdrop-blur-xl"
        />

        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          className="neu-sm absolute right-6 top-6 grid h-10 w-10 place-items-center rounded-full bg-surface text-muted hover:text-ink"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Centred content */}
        <div className="animate-rise relative flex w-full max-w-xl flex-col items-center text-center">
          <AIBlob size={240} state={phase} />

          <p className="mt-6 text-[0.8125rem] font-semibold uppercase tracking-[0.18em] text-accent">
            {PHASE_LABEL[phase]}
          </p>

          {/* Live transcript */}
          <p
            className={cn(
              'mt-4 min-h-[2.5rem] text-[1.375rem] font-semibold leading-snug tracking-[-0.01em] text-ink',
              !transcript && 'text-faint',
            )}
          >
            {transcript || (supported ? 'Ask me anything about your business…' : '')}
          </p>

          {/* Assistant reply */}
          {reply && (
            <div className="glass mt-5 max-h-[30vh] overflow-y-auto rounded-[18px] px-5 py-4 text-left text-[0.9375rem] leading-relaxed text-ink">
              {reply}
            </div>
          )}

          {/* Errors / unsupported */}
          {error && <p className="mt-5 max-w-sm text-[0.875rem] text-negative">{error}</p>}

          {/* Re-trigger button when idle */}
          {phase === 'idle' && supported && (
            <button
              onClick={start}
              className="neu mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[0.875rem] font-semibold text-accent-contrast"
            >
              <Mic className="h-4 w-4" /> Talk again
            </button>
          )}
        </div>
      </div>

      {/* Eye button — always visible. Hold to see the screen behind the HUD. */}
      <button
        onPointerDown={startPeek}
        onPointerUp={endPeek}
        onPointerLeave={endPeek}
        onPointerCancel={endPeek}
        aria-label="Hold to see what's behind"
        title="Hold to peek behind"
        className={cn(
          'neu-sm absolute right-6 top-[4.75rem] z-10 grid h-10 w-10 select-none place-items-center rounded-full bg-surface text-muted transition-colors hover:text-ink',
          peek && 'text-accent',
        )}
        style={{ touchAction: 'none' }}
      >
        <Eye className="h-5 w-5" />
      </button>
    </div>
  );
};

export default VoiceHud;
