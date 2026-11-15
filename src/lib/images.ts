// Shrinks photos in the browser before upload, so phones don't send (and every
// visitor doesn't download) full-size camera images.

// The storage buckets reject files over 5 MB (security_hardening migration)
export const STORAGE_MAX_BYTES = 5 * 1024 * 1024;

// People may pick bigger originals: they are shrunk before upload
export const PHOTO_PICK_MAX_MB = 20;

// Uploaded files get random names and never change, so browsers and the CDN
// may keep them for a year
export const PHOTO_CACHE_SECONDS = '31536000';

export type PreparedImage = {
  body: Blob;
  contentType: string;
  extension: string;
};

function extensionOf(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  const fromType = file.type.split('/')[1];
  return (fromName || fromType || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes so the longest side is at most maxSide pixels and re-encodes as WebP
 * (JPEG where the browser can't write WebP). Keeps the original when it is
 * already smaller, is a GIF (may be animated), or the browser can't read it.
 */
export async function prepareImage(file: File, maxSide: number, quality = 0.82): Promise<PreparedImage> {
  const original: PreparedImage = { body: file, contentType: file.type || 'image/jpeg', extension: extensionOf(file) };
  if (file.type === 'image/gif') return original;

  let bitmap: ImageBitmap;
  try {
    // from-image: phone photos come out the right way up
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return original; // e.g. HEIC in a browser that can't decode it
  }

  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const webp = await canvasToBlob(canvas, 'image/webp', quality);
    // Some browsers ignore the WebP request and return PNG
    const blob = webp && webp.type === 'image/webp' ? webp : await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) return original;

    const prepared: PreparedImage = {
      body: blob,
      contentType: blob.type,
      extension: blob.type === 'image/webp' ? 'webp' : 'jpg',
    };
    // Already small and within size: don't make it worse
    if (scale === 1 && blob.size >= file.size) return original;
    return prepared;
  } finally {
    bitmap.close();
  }
}
