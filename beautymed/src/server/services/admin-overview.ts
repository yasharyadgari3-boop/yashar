import "server-only";
import { prisma } from "@/server/db";

export type AdminCount = { href: string; label: string; count: number };

/** Numbers for the admin overview. Real counts from the database only. */
export async function getAdminCounts(): Promise<AdminCount[]> {
  const [physicians, importers] = await Promise.all([
    prisma.physicianProfile.count({ where: { status: "PENDING" } }),
    prisma.importerProfile.count({ where: { status: "PENDING" } }),
  ]);
  return [
    { href: "/dashboard/admin/verifications", label: "پزشکان در انتظار تأیید", count: physicians },
    { href: "/dashboard/admin/verifications", label: "واردکنندگان در انتظار تأیید", count: importers },
  ];
}
