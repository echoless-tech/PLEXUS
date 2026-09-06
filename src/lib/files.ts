/**
 * Client-side file → data URL helpers. Images are downscaled/re-encoded so
 * uploads stay under the Firestore rule limits; PDFs are passed through and
 * rejected if too large (rules re-check size regardless).
 */

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error || new Error('Could not read file.'));
    r.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be decoded.'));
    img.src = src;
  });

/**
 * Downscale an image so its longest edge ≤ maxEdge and re-encode as JPEG,
 * lowering quality until the data URL fits under maxBytes.
 */
export async function imageToDataUrl(file: File, maxEdge: number, maxBytes: number): Promise<string> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  for (const q of [0.86, 0.75, 0.6, 0.45, 0.3]) {
    const out = canvas.toDataURL('image/jpeg', q);
    if (out.length <= maxBytes) return out;
  }
  throw new Error('Image is too detailed to store — try a smaller photo.');
}

/** Any supported file → data URL within maxBytes (images are downscaled first). */
export async function fileToDataUrl(file: File, opts: { maxEdge: number; maxBytes: number }): Promise<string> {
  if (file.type.startsWith('image/')) return imageToDataUrl(file, opts.maxEdge, opts.maxBytes);
  if (file.type === 'application/pdf') {
    const out = await readAsDataUrl(file);
    if (out.length > opts.maxBytes) throw new Error(`PDF is too large — keep it under ~${Math.round((opts.maxBytes * 0.75) / 1024)} KB.`);
    return out;
  }
  throw new Error('Only images (JPG, PNG, HEIC) and PDFs are supported.');
}
