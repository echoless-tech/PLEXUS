import { useCallback, useEffect, useRef, useState } from 'react';

export type VoicePhase = 'idle' | 'listening' | 'thinking' | 'speaking';

interface UseLiveVoiceOptions {
  /** Submits the recognised question and resolves with the assistant's reply. */
  onSubmit: (question: string) => Promise<string>;
  /** Milliseconds of silence before the question is auto-submitted. */
  silenceMs?: number;
}

interface UseLiveVoiceResult {
  phase: VoicePhase;
  transcript: string;
  reply: string;
  error: string | null;
  supported: boolean;
  /** Begin a listening session. Must be called from a user gesture. */
  start: () => void;
  /** Cancel everything and return to idle. */
  stop: () => void;
}

const isSupported = (): boolean =>
  typeof window !== 'undefined' &&
  !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);

/**
 * One-button live-voice loop: STT → LLM → TTS, with a silence detector that
 * auto-submits once the user stops talking. Modelled on the TuttleShell pattern,
 * but the LLM call is injected so it can route through our existing server proxy
 * (keeping API keys off the client).
 */
export function useLiveVoice({ onSubmit, silenceMs = 4000 }: UseLiveVoiceOptions): UseLiveVoiceResult {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSpeechRef = useRef<number>(0);
  const submittedRef = useRef(false);
  const transcriptRef = useRef('');
  const phaseRef = useRef<VoicePhase>('idle');

  const setPhaseSafe = useCallback((p: VoicePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTick();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    recognitionRef.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* noop */
    }
    submittedRef.current = false;
    setPhaseSafe('idle');
  }, [clearTick, setPhaseSafe]);

  const speak = useCallback(
    (text: string) => {
      if (!text || typeof window === 'undefined' || !window.speechSynthesis) {
        setPhaseSafe('idle');
        return;
      }
      setPhaseSafe('speaking');
      const utter = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      utter.voice =
        voices.find((v) => /Aria|Mark|Guy|Jenny|Natural|Google UK English/i.test(v.name)) ?? null;
      utter.rate = 1.02;
      utter.pitch = 1;
      utter.onend = () => setPhaseSafe('idle');
      utter.onerror = () => setPhaseSafe('idle');
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    },
    [setPhaseSafe],
  );

  const submit = useCallback(
    async (question: string) => {
      setPhaseSafe('thinking');
      setReply('');
      try {
        const answer = await onSubmit(question);
        setReply(answer);
        speak(answer);
      } catch {
        const msg = "Sorry, I couldn't reach the AI service. Please try again.";
        setError(msg);
        setReply(msg);
        speak(msg);
      }
    },
    [onSubmit, setPhaseSafe, speak],
  );

  const start = useCallback(() => {
    if (!isSupported()) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    // Reset state for a fresh session.
    setError(null);
    setTranscript('');
    setReply('');
    transcriptRef.current = '';
    submittedRef.current = false;

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-ZA';

    let committed = '';

    rec.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) committed += r[0].transcript + ' ';
        else interim += r[0].transcript;
      }
      const t = (committed + interim).trim();
      transcriptRef.current = t;
      setTranscript(t);
      lastSpeechRef.current = Date.now();
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Microphone access was blocked. Enable it in your browser settings.');
      } else {
        setError('Voice input error. Please try again.');
      }
      stop();
    };

    rec.onend = () => {
      // If recognition ends on its own (e.g. mobile) and we have text, submit it.
      if (!submittedRef.current && transcriptRef.current.trim() && phaseRef.current === 'listening') {
        submittedRef.current = true;
        clearTick();
        submit(transcriptRef.current.trim());
      }
    };

    // Silence detector: auto-submit after `silenceMs` with no new speech.
    clearTick();
    tickRef.current = setInterval(() => {
      if (submittedRef.current) return;
      const t = transcriptRef.current.trim();
      if (t && Date.now() - lastSpeechRef.current > silenceMs) {
        submittedRef.current = true;
        clearTick();
        try {
          rec.stop();
        } catch {
          /* noop */
        }
        submit(t);
      }
    }, 300);

    try {
      rec.start();
    } catch {
      // start() throws if already started — ignore.
    }
    recognitionRef.current = rec;
    lastSpeechRef.current = Date.now();
    setPhaseSafe('listening');
  }, [clearTick, setPhaseSafe, silenceMs, stop, submit]);

  // Populate the voice list early (Chrome loads them async).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const warm = () => window.speechSynthesis.getVoices();
    warm();
    window.speechSynthesis.addEventListener?.('voiceschanged', warm);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', warm);
  }, []);

  // Clean up on unmount.
  useEffect(() => () => stop(), [stop]);

  return { phase, transcript, reply, error, supported: isSupported(), start, stop };
}

export default useLiveVoice;
