import { prisma } from "@/server/db";

/** Empty every table of the test database (never the development database). */
export async function resetDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL ?? "";
  if (!/_test(\?|$)/.test(url)) throw new Error("Refusing to reset a database whose name does not end in _test.");
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
