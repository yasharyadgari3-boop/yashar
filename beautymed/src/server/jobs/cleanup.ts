/**
 * Scheduled job: delete expired sessions and old one-time-code challenges.
 * Run it with `npm run maintenance:cleanup`, for example once a day from the host's scheduler.
 */
import { existsSync } from "node:fs";

async function main() {
  if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
  const { cleanupExpired } = await import("@/server/services/maintenance");
  const { prisma } = await import("@/server/db");
  try {
    const result = await cleanupExpired();
    console.log(`deleted ${result.sessions} expired sessions, ${result.otpChallenges} old one-time codes`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
