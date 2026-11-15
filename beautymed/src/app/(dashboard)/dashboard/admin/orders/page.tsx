import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/shop/product-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { formatJalaliDateTime, formatNumber, formatToman, toPersianDigits } from "@/lib/format";
import { markFulfilledAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { listAllOrders } from "@/server/services/orders";

export const metadata: Metadata = { title: "سفارش‌ها" };

export default async function AdminOrdersPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/orders");
  const orders = await listAllOrders();

  return (
    <DashboardShell user={user} title="سفارش‌ها" currentHref="/dashboard/admin/orders">
      {orders.length === 0 ? <p className="text-lg text-muted">هنوز سفارشی ثبت نشده است.</p> : null}
      <ul className="space-y-6">
        {orders.map((order) => (
          <li key={order.id} className="border border-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">
                سفارش <span className="latin">{order.number}</span>
              </h2>
              <OrderStatusBadge status={order.status} />
            </div>
            <dl className="mt-3 space-y-1 text-base">
              <div className="flex gap-2">
                <dt className="text-muted">خریدار:</dt>
                <dd>
                  {order.user.physician?.fullName ?? "—"} ({toPersianDigits(order.user.mobile)})
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">تاریخ:</dt>
                <dd>{formatJalaliDateTime(order.createdAt)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">گیرنده:</dt>
                <dd>
                  {order.recipientName}، {toPersianDigits(order.phone)}، {order.city}، {order.address}، کد پستی{" "}
                  {toPersianDigits(order.postalCode)}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">جمع کل:</dt>
                <dd>{formatToman(order.totalToman)}</dd>
              </div>
            </dl>
            <ul className="mt-3 list-inside list-disc text-muted">
              {order.items.map((item) => (
                <li key={item.id}>
                  {item.productName} × {formatNumber(item.quantity)}
                </li>
              ))}
            </ul>
            {order.status === "PAID" ? (
              <ActionForm action={markFulfilledAction} className="mt-4">
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton variant="secondary">ثبت به‌عنوان ارسال‌شده</SubmitButton>
              </ActionForm>
            ) : null}
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
