import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP for rate limiting. Behind a proxy the host must set x-forwarded-for. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
