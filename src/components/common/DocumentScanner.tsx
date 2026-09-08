import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Loader2, Check, RotateCcw, Zap, ZapOff, Upload } from 'lucide-react';
import { Button } from '../ui';

type Facing = 'environment' | 'user';

/** Render a source canvas to `dst` as a "scanned" page: grayscale + contrast. */
function renderScan(src: HTMLCanvasElement, dst: HTMLCanvasElement, mode: 'scan' | 'color') {
  dst.width = src.width;
  dst.height = src.height;
  const g = dst.getContext('2d')!;
  g.drawImage(src, 0, 0);
  if (mode === 'color') return;
  const img = g.getImageData(0, 0, dst.width, dst.height);
  const d = img.data;
  const contrast = 1.55;
  const brightness = 12;
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    v = (v - 128) * contrast + 128 + brightness;
    v = v < 0 ? 0 : v > 255 ? 255 : v;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  g.putImageData(img, 0, 0);
}

/** Downscale a canvas and encode JPEG, backing off quality to fit maxBytes. */
function toJpeg(src: HTMLCanvasElement, maxEdge: number, maxBytes: number): string {
  const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
  const c = document.createElement('canvas');
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  for (const q of [0.85, 0.72, 0.6, 0.48, 0.36]) {
    const out = c.toDataURL('image/jpeg', q);
    if (out.length <= maxBytes) return out;
  }
  return c.toDataURL('image/jpeg', 0.3);
}

export const DocumentScanner: React.FC<{
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  maxEdge?: number;
  maxBytes?: number;
}> = ({ open, onClose, onCapture, maxEdge = 1600, maxBytes = 700_000 }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null); // full-res captured frame
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<'live' | 'review'>('live');
  const [facing, setFacing] = useState<Facing>('environment');
  const [mode, setMode] = useState<'scan' | 'color'>('scan');
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchable, setTorchable] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setTorchOn(false);
    setTorchable(false);
  }, []);

  const start = useCallback(
    async (want: Facing) => {
      setError(null);
      setStarting(true);
      stop();
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: want }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchable(Boolean(caps.torch));
      } catch (e: any) {
        setError(
          e?.name === 'NotAllowedError'
            ? 'Camera permission was blocked. Allow camera access in your browser, or upload a photo instead.'
            : e?.message === 'unsupported'
              ? 'This browser has no camera API. Upload a photo instead.'
              : 'No camera found. Upload a photo instead.',
        );
      } finally {
        setStarting(false);
      }
    },
    [stop],
  );

  // Lifecycle: start on open, stop on close/unmount.
  useEffect(() => {
    if (!open) return;
    setPhase('live');
    setMode('scan');
    start(facing);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    stop();
    onClose();
  };

  const switchCamera = () => {
    const next: Facing = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    start(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] as any });
      setTorchOn((t) => !t);
    } catch {
      /* ignore */
    }
  };

  const capture = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const base = document.createElement('canvas');
    base.width = v.videoWidth;
    base.height = v.videoHeight;
    base.getContext('2d')!.drawImage(v, 0, 0);
    baseRef.current = base;
    setPhase('review');
    stop();
  };

  // Re-render the review preview whenever the enhancement mode changes.
  useEffect(() => {
    if (phase === 'review' && baseRef.current && previewRef.current) {
      renderScan(baseRef.current, previewRef.current, mode);
    }
  }, [phase, mode]);

  const retake = () => {
    baseRef.current = null;
    setPhase('live');
    start(facing);
  };

  const usePhoto = () => {
    const base = baseRef.current;
    if (!base) return;
    const out = document.createElement('canvas');
    renderScan(base, out, mode);
    onCapture(toJpeg(out, maxEdge, maxBytes));
    close();
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const base = document.createElement('canvas');
      base.width = img.width;
      base.height = img.height;
      base.getContext('2d')!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      baseRef.current = base;
      stop();
      setPhase('review');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError('Could not read that image.');
    };
    img.src = url;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Document scanner">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <button onClick={close} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close scanner">
          <X className="h-5 w-5" />
        </button>
        <p className="text-[0.875rem] font-semibold">{phase === 'live' ? 'Scan document' : 'Review scan'}</p>
        <div className="flex gap-2">
          {phase === 'live' && torchable && (
            <button onClick={toggleTorch} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Toggle flash">
              {torchOn ? <Zap className="h-5 w-5 text-amber-300" /> : <ZapOff className="h-5 w-5" />}
            </button>
          )}
          {phase === 'live' && (
            <button onClick={switchCamera} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Switch camera">
              <RefreshCw className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Stage */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {error ? (
          <div className="mx-auto max-w-sm rounded-3xl bg-white p-6 text-center">
            <Camera className="mx-auto h-8 w-8 text-muted" />
            <p className="mt-3 text-[0.9375rem] font-semibold text-ink">Camera unavailable</p>
            <p className="mt-1 text-[0.8125rem] text-muted">{error}</p>
            <Button variant="accent" className="mt-4 w-full" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload a photo instead
            </Button>
          </div>
        ) : phase === 'live' ? (
          <>
            <video ref={videoRef} playsInline muted autoPlay className="max-h-full max-w-full rounded-2xl" />
            {/* Document framing guide */}
            <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed border-white/50 sm:inset-x-[15%] sm:inset-y-10" />
            {starting && (
              <div className="absolute inset-0 grid place-items-center text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            )}
            <p className="absolute bottom-3 left-0 right-0 text-center text-[0.75rem] text-white/70">
              Fit the document inside the frame, then capture.
            </p>
          </>
        ) : (
          <canvas ref={previewRef} className="max-h-full max-w-full rounded-2xl bg-white shadow-2xl" />
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
        {phase === 'live' && !error && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => fileRef.current?.click()}
              className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Upload instead"
              title="Upload a photo instead"
            >
              <Upload className="h-5 w-5" />
            </button>
            <button
              onClick={capture}
              disabled={starting}
              className="grid h-18 w-18 place-items-center rounded-full bg-white ring-4 ring-white/30 transition-transform active:scale-95 disabled:opacity-50"
              style={{ height: 72, width: 72 }}
              aria-label="Capture"
            >
              <Camera className="h-7 w-7 text-black" />
            </button>
            <div className="h-11 w-11" />
          </div>
        )}

        {phase === 'review' && (
          <div className="mx-auto flex max-w-md flex-col gap-3">
            <div className="flex justify-center">
              <div className="inline-flex rounded-full bg-white/10 p-1 text-[0.8125rem] font-semibold text-white">
                <button onClick={() => setMode('scan')} className={'rounded-full px-4 py-1.5 ' + (mode === 'scan' ? 'bg-white text-black' : '')}>
                  Scan
                </button>
                <button onClick={() => setMode('color')} className={'rounded-full px-4 py-1.5 ' + (mode === 'color' ? 'bg-white text-black' : '')}>
                  Colour
                </button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" className="flex-1" onClick={retake}>
                <RotateCcw className="h-4 w-4" /> Retake
              </Button>
              <Button variant="accent" className="flex-1" onClick={usePhoto}>
                <Check className="h-4 w-4" /> Use scan
              </Button>
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onFilePicked} />
    </div>
  );
};

export default DocumentScanner;
