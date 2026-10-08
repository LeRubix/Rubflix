import type { Area } from 'react-easy-crop';

const OUTPUT_SIZE = 512;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

export async function cropImageToJpegDataUrl(
  imageSrc: string,
  pixelCrop: Area,
  quality = 0.9,
): Promise<string> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE,
  );

  return canvas.toDataURL('image/jpeg', quality);
}

export function filePathToImageSrc(filePath: string): string {
  if (filePath.startsWith('file://') || filePath.startsWith('http')) return filePath;
  return `file:///${filePath.replace(/\\/g, '/')}`;
}
