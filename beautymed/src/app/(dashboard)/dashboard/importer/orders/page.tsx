import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/shop/product-card";
import { formatJalaliDate, formatNumber, formatToman } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { canSubmitProducts } from "@/server/rbac/permissions";
import { listOrderItemsForImporter } from "@/server/services/orders";

export const metadata: Metadata = { title: "سفارش‌های محصولات من" };

export default async function ImporterOrdersPage() {
  const user = await requireRole("IMPORTER", "/dashboard/importer/orders");
  if (!canSubmitProducts(user) || !user.importerProfileId) notFound();
  const items = await listOrderItemsForImporter(user.importerProfileId);

  return (
    <DashboardShell user={user} title="سفارش‌های محصولات من" currentHref="/dashboard/importer/orders">
      <p className="text-muted">فقط اقلام پرداخت‌شده‌ی محصولات شما نمایش داده می‌شود. اطلاعات تماس خریدار نزد مدیر سایت است.</p>
      {items.length === 0 ? (
        <p className="mt-8 text-lg text-muted">هنوز سفارشی برای محصولات شما ثبت نشده است.</p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
              <span>
                <span className="text-lg">
                  {item.productName} × {formatNumber(item.quantity)}
                </span>
                <span className="ms-3 text-muted">
                  سفارش <span className="latin">{item.order.number}</span>، {item.order.city}، {formatJalaliDate(item.order.createdAt)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <OrderStatusBadge status={item.order.status} />
                <span>{formatToman(item.unitPriceToman * item.quantity)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
