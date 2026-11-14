/**
 * Empties the end-to-end test database before a browser-test run. It refuses to touch any
 * database whose name does not end in "_e2e", so it can never clear development or real data.
 */
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_e2e")) {
    throw new Error(`Refusing to empty database "${name}": its name does not end in _e2e.`);
  }
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    const { rows } = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    if (rows.length > 0) {
      await db.query(`TRUNCATE TABLE ${rows.map((r) => `"public"."${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
