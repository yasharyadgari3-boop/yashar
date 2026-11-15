/**
 * Scheduled job: run every enabled saved search once and store new articles.
 * Run it with `npm run pubmed:fetch` (for example once a day, outside NCBI's peak hours,
 * from the host's scheduler; which scheduler is decided together with hosting).
 */
import { existsSync } from "node:fs";

async function main() {
  if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");
  const { getPubmedClient } = await import("@/server/adapters/pubmed");
  const { ensureDefaultTopics, fetchAllTopics } = await import("@/server/services/library");
  const { prisma } = await import("@/server/db");
  try {
    await ensureDefaultTopics();
    const results = await fetchAllTopics(getPubmedClient(), Number(process.env.PUBMED_FETCH_LIMIT) || 10);
    for (const r of results) {
      console.log("error" in r ? `${r.slug}: FAILED ${r.error}` : `${r.slug}: checked ${r.found}, added ${r.added}`);
    }
    if (results.some((r) => "error" in r)) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
