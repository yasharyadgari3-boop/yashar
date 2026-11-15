import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell, Panel } from "@/components/dashboard/dashboard-shell";
import { OrderStatusBadge } from "@/components/shop/product-card";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { formatJalaliDateTime, formatNumber, formatToman, toPersianDigits } from "@/lib/format";
import { payOrderAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { getOrderForUser } from "@/server/services/orders";

export const metadata: Metadata = { title: "جزئیات سفارش" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ payment?: string }> };

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const user = await requireRole("PHYSICIAN", `/orders/${id}`);
  const order = await getOrderForUser(user.id, id);
  // An order that is not the viewer's own looks exactly like one that does not exist.
  if (!order) notFound();
  const { payment } = await searchParams;
  const refId = order.payments.find((p) => p.status === "SUCCEEDED")?.refId;

  return (
    <DashboardShell user={user} title={`سفارش ${order.number}`} currentHref="/orders">
      {payment === "ok" && order.status !== "PENDING_PAYMENT" ? (
        <p role="status" className="mb-8 border border-line bg-alt px-4 py-3">
          پرداخت با موفقیت انجام شد و سفارش شما ثبت شد.
        </p>
      ) : null}
      {payment === "failed" && order.status === "PENDING_PAYMENT" ? (
        <p role="alert" className="mb-8 border-2 border-ink px-4 py-3">
          پرداخت انجام نشد. سفارش شما در انتظار پرداخت مانده است و می‌توانید دوباره پرداخت کنید.
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="وضعیت">
          <p>
            <OrderStatusBadge status={order.status} />
          </p>
          <p className="text-muted">تاریخ ثبت: {formatJalaliDateTime(order.createdAt)}</p>
          {refId ? (
            <p className="text-muted">
              کد پیگیری پرداخت: <span className="latin">{refId}</span>
            </p>
          ) : null}
          {order.status === "PENDING_PAYMENT" ? (
            <ActionForm action={payOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <SubmitButton pendingLabel="در حال انتقال به درگاه…">پرداخت سفارش</SubmitButton>
            </ActionForm>
          ) : null}
        </Panel>

        <Panel title="نشانی ارسال">
          <p>{order.recipientName}</p>
          <p>{toPersianDigits(order.phone)}</p>
          <p>
            {order.city}، {order.address}
          </p>
          <p>کد پستی: {toPersianDigits(order.postalCode)}</p>
          {order.note ? <p className="text-muted">{order.note}</p> : null}
        </Panel>
      </div>

      <section aria-labelledby="items-title" className="mt-10">
        <h2 id="items-title" className="text-2xl">
          اقلام سفارش
        </h2>
        <ul className="mt-4 border-t border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3">
              <span>
                {item.productName} × {formatNumber(item.quantity)}
              </span>
              <span>{formatToman(item.unitPriceToman * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center justify-between text-xl">
          <span>جمع کل</span>
          <strong>{formatToman(order.totalToman)}</strong>
        </p>
      </section>
    </DashboardShell>
  );
}
