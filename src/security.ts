const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function cleanText(value: string, maxLength = 500) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, maxLength);
}

// Reasonable single-address email shape: something@something.tld (no spaces).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// RFC-reserved / placeholder domains that can never receive mail — accepting
// them guarantees a bounce, which hurts the project's email deliverability.
const UNDELIVERABLE_DOMAINS = new Set(["example.com", "example.org", "example.net", "test.com", "email.com", "domain.com"]);
const UNDELIVERABLE_TLDS = /\.(test|example|invalid|local|localhost)$/;

// Common typos in popular mail domains → the address the user almost certainly meant.
const DOMAIN_TYPOS: Record<string, string> = {
  "gmail.con": "gmail.com", "gmail.co": "gmail.com", "gmail.cm": "gmail.com", "gmail.comm": "gmail.com",
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gnail.com": "gmail.com", "gmaill.com": "gmail.com", "gmail.om": "gmail.com",
  "hotmail.con": "hotmail.com", "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com", "hotmal.com": "hotmail.com",
  "yahoo.con": "yahoo.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com", "yhaoo.com": "yahoo.com",
  "outlook.con": "outlook.com", "outlok.com": "outlook.com", "outloo.com": "outlook.com", "outlook.co": "outlook.com",
  "icloud.con": "icloud.com", "iclould.com": "icloud.com",
  "live.con": "live.com", "aol.con": "aol.com", "protonmail.con": "protonmail.com",
};

export type EmailCheck = { ok: boolean; reason?: string; suggestion?: string };

// Validate an email before we ask the backend to send a confirmation to it.
// Catches malformed addresses, undeliverable placeholder domains, and obvious
// typos (offering a correction) so users don't bounce their own signup.
export function validateEmail(raw: string): EmailCheck {
  const email = (raw ?? "").trim();
  if (!email) return { ok: false, reason: "Enter your email address." };
  if (/\s/.test(email)) return { ok: false, reason: "Email addresses can't contain spaces." };
  if (!EMAIL_RE.test(email)) return { ok: false, reason: "That doesn't look like a valid email address." };

  const at = email.lastIndexOf("@");
  const local = email.slice(0, at + 1);
  const domain = email.slice(at + 1).toLowerCase();

  if (UNDELIVERABLE_DOMAINS.has(domain) || UNDELIVERABLE_TLDS.test(domain)) {
    return { ok: false, reason: "Use a real email address you can receive mail at." };
  }
  const fix = DOMAIN_TYPOS[domain];
  if (fix) return { ok: false, reason: `Did you mean ${local}${fix}?`, suggestion: `${local}${fix}` };

  return { ok: true };
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
