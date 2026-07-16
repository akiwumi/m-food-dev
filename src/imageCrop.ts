export type CropSize = { width: number; height: number };
export type CropTransform = { scale: number; x: number; y: number };

export const MIN_CROP_SCALE = 1;
export const MAX_CROP_SCALE = 2.5;

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampCropScale(value: number): number {
  if (!Number.isFinite(value)) return MIN_CROP_SCALE;
  return clamp(value, MIN_CROP_SCALE, MAX_CROP_SCALE);
}

export function cropDrawRect(image: CropSize, transform: CropTransform, viewport: CropSize) {
  const scale = clampCropScale(transform.scale);
  const baseScale = Math.max(viewport.width / image.width, viewport.height / image.height);
  const drawScale = baseScale * scale;
  const width = Math.round(image.width * drawScale);
  const height = Math.round(image.height * drawScale);
  return {
    x: Math.round((viewport.width - width) / 2 + finite(transform.x)),
    y: Math.round((viewport.height - height) / 2 + finite(transform.y)),
    width,
    height,
  };
}

export function clampCropTransform(transform: Partial<CropTransform>, image: CropSize, viewport: CropSize): CropTransform {
  const scale = clampCropScale(transform.scale ?? MIN_CROP_SCALE);
  const rect = cropDrawRect(image, { scale, x: 0, y: 0 }, viewport);
  const maxX = Math.max(0, (rect.width - viewport.width) / 2);
  const maxY = Math.max(0, (rect.height - viewport.height) / 2);
  return {
    scale,
    x: clamp(finite(transform.x ?? 0), -maxX, maxX),
    y: clamp(finite(transform.y ?? 0), -maxY, maxY),
  };
}

export function scaleCropTransform(transform: CropTransform, ratio: number): CropTransform {
  return {
    scale: clampCropScale(transform.scale),
    x: Math.round(finite(transform.x) * ratio),
    y: Math.round(finite(transform.y) * ratio),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The image could not be edited."));
    image.src = src;
  });
}

export async function cropImageDataUrl(
  dataUrl: string,
  transform: CropTransform,
  preview: CropSize,
  output: CropSize,
  quality = 0.78,
): Promise<string> {
  const image = await loadImage(dataUrl);
  const imageSize = { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
  if (!imageSize.width || !imageSize.height) throw new Error("The image could not be edited.");
  const canvas = document.createElement("canvas");
  canvas.width = output.width;
  canvas.height = output.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The image could not be edited.");

  const ratio = output.width / preview.width;
  const outputTransform = scaleCropTransform(transform, ratio);
  const rect = cropDrawRect(imageSize, clampCropTransform(outputTransform, imageSize, output), output);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, output.width, output.height);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

  const cropped = canvas.toDataURL("image/jpeg", quality);
  if (!cropped.startsWith("data:image/jpeg")) throw new Error("The image could not be edited.");
  return cropped;
}
