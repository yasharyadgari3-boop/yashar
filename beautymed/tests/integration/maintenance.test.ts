// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { cleanupExpired, OTP_RETENTION_MS } from "@/server/services/maintenance";
import { resetDatabase } from "./helpers";

beforeEach(resetDatabase);

describe("cleanupExpired", () => {
  it("deletes expired sessions and old one-time codes, and keeps current ones", async () => {
    const now = new Date("2026-11-16T12:00:00Z");
    const user = await prisma.user.create({ data: { mobile: "09121111111" } });
    await prisma.session.createMany({
      data: [
        { tokenHash: "expired", userId: user.id, expiresAt: new Date(now.getTime() - 1000) },
        { tokenHash: "valid", userId: user.id, expiresAt: new Date(now.getTime() + 60_000) },
      ],
    });
    const otp = { mobile: "09121111111", codeHash: "x", expiresAt: now };
    await prisma.otpChallenge.createMany({
      data: [
        { ...otp, createdAt: new Date(now.getTime() - OTP_RETENTION_MS - 1000) },
        // Still inside the retention window: needed for rate limiting.
        { ...otp, createdAt: new Date(now.getTime() - 5 * 60_000) },
      ],
    });

    expect(await cleanupExpired(now)).toEqual({ sessions: 1, otpChallenges: 1 });
    expect(await prisma.session.findMany({ select: { tokenHash: true } })).toEqual([{ tokenHash: "valid" }]);
    expect(await prisma.otpChallenge.count()).toBe(1);
    // Running it again changes nothing.
    expect(await cleanupExpired(now)).toEqual({ sessions: 0, otpChallenges: 0 });
  });
});
