export const AVATAR_IMAGE_SIZE = 512;
export const MIN_AVATAR_SCALE = 1;
export const MAX_AVATAR_SCALE = 2.5;
export const AVATAR_PREVIEW_SIZE = 144;

export type AvatarImageSize = { width: number; height: number };
export type AvatarTransform = { scale: number; x: number; y: number };

export function clampAvatarScale(value: number): number {
  if (!Number.isFinite(value)) return MIN_AVATAR_SCALE;
  return Math.min(MAX_AVATAR_SCALE, Math.max(MIN_AVATAR_SCALE, value));
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function avatarDrawRect(image: AvatarImageSize, transform: AvatarTransform, viewportSize = AVATAR_IMAGE_SIZE) {
  const zoom = clampAvatarScale(transform.scale);
  const baseScale = Math.max(viewportSize / image.width, viewportSize / image.height);
  const drawScale = baseScale * zoom;
  const width = Math.round(image.width * drawScale);
  const height = Math.round(image.height * drawScale);
  const x = Math.round((viewportSize - width) / 2 + finite(transform.x));
  const y = Math.round((viewportSize - height) / 2 + finite(transform.y));
  return { x, y, width, height };
}

export function clampAvatarTransform(
  transform: Partial<AvatarTransform>,
  image?: AvatarImageSize,
  viewportSize = AVATAR_PREVIEW_SIZE,
): AvatarTransform {
  const scale = clampAvatarScale(transform.scale ?? MIN_AVATAR_SCALE);
  const safeImage = image && image.width > 0 && image.height > 0 ? image : { width: viewportSize, height: viewportSize };
  const rect = avatarDrawRect(safeImage, { scale, x: 0, y: 0 }, viewportSize);
  const maxX = Math.max(0, (rect.width - viewportSize) / 2);
  const maxY = Math.max(0, (rect.height - viewportSize) / 2);
  return {
    scale,
    x: clamp(finite(transform.x ?? 0), -maxX, maxX),
    y: clamp(finite(transform.y ?? 0), -maxY, maxY),
  };
}

export function scaleAvatarTransform(transform: AvatarTransform, ratio: number): AvatarTransform {
  return {
    scale: clampAvatarScale(transform.scale),
    x: Math.round(finite(transform.x) * ratio),
    y: Math.round(finite(transform.y) * ratio),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The profile photo could not be resized."));
    image.src = src;
  });
}

export async function resizeAvatarDataUrl(dataUrl: string, transform: number | AvatarTransform, previewSize = AVATAR_PREVIEW_SIZE): Promise<string> {
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("The profile photo could not be resized.");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_IMAGE_SIZE;
  canvas.height = AVATAR_IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The profile photo could not be resized.");

  const previewTransform = typeof transform === "number" ? { scale: transform, x: 0, y: 0 } : transform;
  const outputTransform = scaleAvatarTransform(previewTransform, AVATAR_IMAGE_SIZE / previewSize);
  const rect = avatarDrawRect({ width, height }, clampAvatarTransform(outputTransform, { width, height }, AVATAR_IMAGE_SIZE), AVATAR_IMAGE_SIZE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_IMAGE_SIZE, AVATAR_IMAGE_SIZE);
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

  const resized = canvas.toDataURL("image/jpeg", 0.82);
  if (!resized.startsWith("data:image/jpeg")) throw new Error("The profile photo could not be resized.");
  return resized;
}
