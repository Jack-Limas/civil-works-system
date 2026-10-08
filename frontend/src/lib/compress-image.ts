/**
 * Client-side photo compression for expense supports. Phone photos are often
 * larger than the 5 MB upload limit; they are resized to MAX_SIZE px on the
 * longest side and re-encoded as JPEG.
 *
 * Preferred path: a dedicated Web Worker (public/workers/image-compress.worker.js)
 * using createImageBitmap + OffscreenCanvas, so decoding never blocks the UI.
 * Fallback (browsers without OffscreenCanvas in workers, e.g. older Safari):
 * the same steps on the main thread with a regular canvas.
 */
const MAX_SIZE = 1600;
const QUALITY = 0.8;
const WORKER_TIMEOUT_MS = 20_000;

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressed: boolean;
}

let worker: Worker | null = null;
let nextId = 1;

function supportsWorkerCompression() {
  return typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined" && typeof createImageBitmap !== "undefined";
}

function getWorker() {
  worker ??= new Worker("/workers/image-compress.worker.js");
  return worker;
}

function compressInWorker(file: File): Promise<Blob> {
  const w = getWorker();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      w.removeEventListener("message", onMessage);
      reject(new Error("Compression timed out"));
    }, WORKER_TIMEOUT_MS);

    function onMessage(event: MessageEvent<{ id: number; blob?: Blob; error?: string }>) {
      if (event.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      if (event.data.blob) resolve(event.data.blob);
      else reject(new Error(event.data.error ?? "Compression failed"));
    }

    w.addEventListener("message", onMessage);
    w.postMessage({ id, file, maxSize: MAX_SIZE, quality: QUALITY });
  });
}

async function compressOnMainThread(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))), "image/jpeg", QUALITY)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Compresses images; other files (PDF) are returned untouched. Never returns a bigger file. */
export async function compressImage(file: File): Promise<CompressionResult> {
  if (!file.type.startsWith("image/")) return { file, originalSize: file.size, compressed: false };

  let blob: Blob;
  try {
    blob = supportsWorkerCompression() ? await compressInWorker(file) : await compressOnMainThread(file);
  } catch {
    // Worker failure (e.g. unsupported format such as HEIC): try the main thread once
    try {
      blob = await compressOnMainThread(file);
    } catch {
      return { file, originalSize: file.size, compressed: false };
    }
  }

  if (blob.size >= file.size) return { file, originalSize: file.size, compressed: false };
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { file: new File([blob], name, { type: "image/jpeg" }), originalSize: file.size, compressed: true };
}
