import "server-only";
import { prisma } from "@/server/db";
import { OTP_RULES } from "@/server/auth/otp";

/** One-time codes are kept a day after their rate-limit window, then deleted. */
export const OTP_RETENTION_MS = 24 * 60 * 60 * 1000;

if (OTP_RETENTION_MS <= Math.max(OTP_RULES.perMobile.windowMs, OTP_RULES.perIp.windowMs)) {
  throw new Error("OTP retention must outlast the rate-limit windows.");
}

/** Delete expired sessions and old one-time-code challenges. Safe to run any number of times. */
export async function cleanupExpired(now: Date = new Date()): Promise<{ sessions: number; otpChallenges: number }> {
  const [sessions, otpChallenges] = await prisma.$transaction([
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.otpChallenge.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - OTP_RETENTION_MS) } } }),
  ]);
  return { sessions: sessions.count, otpChallenges: otpChallenges.count };
}
