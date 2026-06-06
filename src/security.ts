const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function cleanText(value: string, maxLength = 500) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

export function validateImage(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error("Use a JPEG, PNG, or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images must be smaller than 4 MB.");
}

export function readSafeImage(file: File) {
  validateImage(file);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
