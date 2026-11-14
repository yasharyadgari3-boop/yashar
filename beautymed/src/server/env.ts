import "server-only";
import { normalizeMobile } from "@/lib/persian-text";

const isProduction = () => process.env.NODE_ENV === "production";

/** Secret used to HMAC one-time codes. Required (32+ characters); set it in .env. */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET is missing or shorter than 32 characters. See .env.example.");
  }
  return secret;
}

/**
 * Mock adapters (SMS, payment) are for development and tests. In a production build they
 * refuse to run unless ALLOW_MOCKS_IN_PRODUCTION=true is set explicitly (never on the real site).
 */
export function mocksAllowed(): boolean {
  return !isProduction() || process.env.ALLOW_MOCKS_IN_PRODUCTION === "true";
}

/** Mobile numbers that become ADMIN when they log in (comma-separated ADMIN_MOBILES). */
export function adminMobiles(): ReadonlySet<string> {
  const list = (process.env.ADMIN_MOBILES ?? "")
    .split(",")
    .map((m) => normalizeMobile(m))
    .filter((m): m is string => m !== null);
  return new Set(list);
}

export function secureCookies(): boolean {
  return isProduction() && process.env.INSECURE_COOKIES !== "true";
}
