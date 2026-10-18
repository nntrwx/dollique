const MAX_SIDE = 1600;
const QUALITY = 0.86;

// Big photos from a phone are scaled down in the browser before the upload:
// they load much faster in the feed and look the same on screen.
// GIFs (may be animated) and photos that are already small stay as they are.
export async function shrinkPhoto(file) {
  if (file.type === 'image/gif' || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 600 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    // JPEG stays JPEG; PNG/WEBP become WEBP, which keeps transparency
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const blob = await new Promise((resolve) => { canvas.toBlob(resolve, type, QUALITY); });
    // an old browser that can't write WEBP returns a PNG instead: then keep the original
    if (!blob || blob.type !== type || blob.size >= file.size) return file;
    const name = file.name.replace(/\.\w+$/, '') + (type === 'image/jpeg' ? '.jpg' : '.webp');
    return new File([blob], name, { type });
  } catch {
    return file;
  }
}

