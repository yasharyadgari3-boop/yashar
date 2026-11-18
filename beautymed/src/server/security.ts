import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/** Six-digit one-time code from a cryptographically secure source. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The code is bound to the mobile number and keyed with the server secret. */
export function hashOtp(mobile: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${mobile}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}

/**
 * Only same-site paths are accepted as a post-login destination (no open redirects).
 *
 * Browsers delete tabs and line breaks anywhere in a URL and read "\" as "/", so "/<TAB>/evil.example"
 * means "//evil.example" to them. Any control character or backslash is therefore refused outright,
 * and the path must still resolve to this site when it is parsed like a browser would.
 */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  for (let i = 0; i < next.length; i++) {
    const code = next.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f || code === 0x5c) return fallback;
  }
  const site = "http://same-site.invalid";
  try {
    if (new URL(next, site).origin !== site) return fallback;
  } catch {
    return fallback;
  }
  return next;
}
