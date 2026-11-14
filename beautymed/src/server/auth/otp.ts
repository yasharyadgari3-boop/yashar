import "server-only";
import { getSmsProvider } from "@/server/adapters/sms";
import { prisma } from "@/server/db";
import { adminMobiles, getAuthSecret } from "@/server/env";
import { generateOtpCode, hashOtp, safeEqualHex } from "@/server/security";

export const OTP_RULES = {
  ttlMs: 2 * 60_000,
  maxAttempts: 5,
  perMobile: { limit: 3, windowMs: 10 * 60_000 },
  perIp: { limit: 10, windowMs: 10 * 60_000 },
} as const;

export type RequestOtpResult = { ok: true } | { ok: false; reason: "rate_limited" };

/**
 * Create and send a one-time code. Limits are counted in the database, so they hold across
 * server instances. The SMS call is made outside any transaction.
 */
export async function requestOtp(mobile: string, ip: string | null, now: Date = new Date()): Promise<RequestOtpResult> {
  const [byMobile, byIp] = await Promise.all([
    prisma.otpChallenge.count({
      where: { mobile, createdAt: { gt: new Date(now.getTime() - OTP_RULES.perMobile.windowMs) } },
    }),
    ip
      ? prisma.otpChallenge.count({ where: { ip, createdAt: { gt: new Date(now.getTime() - OTP_RULES.perIp.windowMs) } } })
      : Promise.resolve(0),
  ]);
  if (byMobile >= OTP_RULES.perMobile.limit || byIp >= OTP_RULES.perIp.limit) {
    return { ok: false, reason: "rate_limited" };
  }

  const code = generateOtpCode();
  await prisma.otpChallenge.create({
    data: {
      mobile,
      codeHash: hashOtp(mobile, code, getAuthSecret()),
      expiresAt: new Date(now.getTime() + OTP_RULES.ttlMs),
      ip,
      createdAt: now,
    },
  });
  await getSmsProvider().sendOtp(mobile, code);
  return { ok: true };
}

export type VerifyOtpResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "locked" };

/**
 * Check a code against the newest challenge for this number. Wrong, expired and unknown codes
 * all give the same "invalid" answer. Each challenge allows a limited number of attempts and
 * can be used once.
 */
export async function verifyOtp(mobile: string, code: string, now: Date = new Date()): Promise<VerifyOtpResult> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { mobile, consumedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  if (!challenge || challenge.expiresAt <= now) return { ok: false, reason: "invalid" };

  // Count the attempt first, atomically, so parallel guesses cannot exceed the limit.
  const counted = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null, attempts: { lt: OTP_RULES.maxAttempts } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) return { ok: false, reason: "locked" };

  if (!safeEqualHex(challenge.codeHash, hashOtp(mobile, code, getAuthSecret()))) {
    return { ok: false, reason: "invalid" };
  }

  const consumed = await prisma.otpChallenge.updateMany({
    where: { id: challenge.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count === 0) return { ok: false, reason: "invalid" };

  const makeAdmin = adminMobiles().has(mobile);
  const user = await prisma.user.upsert({
    where: { mobile },
    create: { mobile, role: makeAdmin ? "ADMIN" : null },
    update: makeAdmin ? { role: "ADMIN" } : {},
    select: { id: true, deletedAt: true },
  });
  if (user.deletedAt) return { ok: false, reason: "invalid" };
  return { ok: true, userId: user.id };
}
