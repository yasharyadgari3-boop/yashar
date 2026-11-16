import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";

/** Health check for the host's uptime monitor: 200 when the database answers, 503 otherwise. No details are exposed. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
