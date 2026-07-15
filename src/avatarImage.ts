export const AVATAR_IMAGE_SIZE = 512;
export const MIN_AVATAR_SCALE = 1;
export const MAX_AVATAR_SCALE = 2.5;

export function clampAvatarScale(value: number): number {
  if (!Number.isFinite(value)) return MIN_AVATAR_SCALE;
  return Math.min(MAX_AVATAR_SCALE, Math.max(MIN_AVATAR_SCALE, value));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The profile photo could not be resized."));
    image.src = src;
  });
}

export async function resizeAvatarDataUrl(dataUrl: string, scale: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) throw new Error("The profile photo could not be resized.");

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_IMAGE_SIZE;
  canvas.height = AVATAR_IMAGE_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The profile photo could not be resized.");

  const zoom = clampAvatarScale(scale);
  const drawScale = Math.max(AVATAR_IMAGE_SIZE / width, AVATAR_IMAGE_SIZE / height) * zoom;
  const drawWidth = width * drawScale;
  const drawHeight = height * drawScale;
  const x = (AVATAR_IMAGE_SIZE - drawWidth) / 2;
  const y = (AVATAR_IMAGE_SIZE - drawHeight) / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, AVATAR_IMAGE_SIZE, AVATAR_IMAGE_SIZE);
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  const resized = canvas.toDataURL("image/jpeg", 0.82);
  if (!resized.startsWith("data:image/jpeg")) throw new Error("The profile photo could not be resized.");
  return resized;
}
