import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/shop/product-card";
import { formatJalaliDate, formatToman, toPersianDigits } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { listOrdersForUser } from "@/server/services/orders";

export const metadata: Metadata = { title: "سفارش‌های من" };

export default async function OrdersPage() {
  const user = await requireRole("PHYSICIAN", "/orders");
  const orders = await listOrdersForUser(user.id);

  return (
    <DashboardShell user={user} title="سفارش‌های من" currentHref="/orders">
      {orders.length === 0 ? (
        <p className="text-lg text-muted">هنوز سفارشی ثبت نکرده‌اید.</p>
      ) : (
        <ul className="border-t border-line">
          {orders.map((order) => (
            <li key={order.id} className="border-b border-line">
              <Link href={`/orders/${order.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 hover:underline">
                <span>
                  سفارش <span className="latin">{order.number}</span>
                  <span className="ms-3 text-muted">{formatJalaliDate(order.createdAt)}</span>
                </span>
                <span className="flex items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <span>{formatToman(order.totalToman)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">تعداد سفارش‌ها: {toPersianDigits(orders.length)}</p>
    </DashboardShell>
  );
}
