import type { ItemImage } from '../core/types';
import { M2 } from './strings';

/** Decode locally, strip metadata, and keep the .krono self-contained. */
export async function importImage(file: File): Promise<ItemImage> {
  if (file.size > 20 * 1024 * 1024) throw new Error(M2.imageTooLarge);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(M2.invalidImage);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(M2.invalidImage); }
  try {
    const ratio = Math.min(1, 512 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio)); canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error(M2.invalidImage);
    // JPEG cannot retain alpha; use an explicit paper backing.
    context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { src: canvas.toDataURL('image/jpeg', .85) };
  } finally { bitmap.close(); }
}
