// Dedicated Web Worker that shrinks phone photos before upload.
// Plain JS on purpose (served from /public, like the other workers, so
// Turbopack does not need to bundle it).
//
// Message in:  { id, file: Blob, maxSize: number, quality: number }
// Message out: { id, blob: Blob, width, height }  or  { id, error: string }
//
// Decoding (createImageBitmap) and re-encoding (OffscreenCanvas) both run
// here, so the main thread stays responsive while a 6-12 MB photo is resized.

self.onmessage = async function (event) {
  const { id, file, maxSize, quality } = event.data;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    // White background: PNGs with transparency would otherwise turn black in JPEG
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    self.postMessage({ id, blob, width, height });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
