import "server-only";
import { prisma } from "@/server/db";

export type AdminCount = { href: string; label: string; count: number };

/** Numbers for the admin overview. Real counts from the database only. */
export async function getAdminCounts(): Promise<AdminCount[]> {
  const [physicians, importers, products, orders, proposals] = await Promise.all([
    prisma.physicianProfile.count({ where: { status: "PENDING" } }),
    prisma.importerProfile.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { status: "PENDING", deletedAt: null } }),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.collaborationProposal.count({ where: { status: "NEW" } }),
  ]);
  return [
    { href: "/dashboard/admin/verifications", label: "پزشکان در انتظار تأیید", count: physicians },
    { href: "/dashboard/admin/verifications", label: "واردکنندگان در انتظار تأیید", count: importers },
    { href: "/dashboard/admin/products", label: "محصولات در انتظار بررسی", count: products },
    { href: "/dashboard/admin/orders", label: "سفارش‌های پرداخت‌شده‌ی آماده‌ی ارسال", count: orders },
    { href: "/dashboard/admin/proposals", label: "پیشنهادهای همکاری تازه", count: proposals },
  ];
}
