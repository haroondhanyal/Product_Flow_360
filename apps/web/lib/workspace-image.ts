const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 350 * 1024;

/** Accepts images up to 10 MB, then resizes them so localStorage stays practical. */
export async function prepareWorkspaceImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_SOURCE_BYTES) {
    throw new Error('Choose a PNG, JPG or WebP image up to 10 MB.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not process the image.');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(0.48, 0.86 - attempt * 0.06);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('This image could not be processed.')), 'image/webp', quality));
      if (blob.size <= MAX_OUTPUT_BYTES || attempt === 7) {
        if (blob.size > MAX_OUTPUT_BYTES) throw new Error('This image is too detailed to fit in workspace storage. Choose a smaller image.');
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('This image could not be read.'));
          reader.onerror = () => reject(new Error('This image could not be read.'));
          reader.readAsDataURL(blob);
        });
      }
      scale *= 0.82;
    }
    throw new Error('This image could not be processed.');
  } finally {
    bitmap.close();
  }
}
