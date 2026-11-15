import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { MAX_QUANTITY } from "@/lib/compliance";
import { formatToman } from "@/lib/format";
import { updateCartAction } from "@/server/actions/store";
import { requireUser } from "@/server/auth/session";
import { canOrder } from "@/server/rbac/permissions";
import { getCart } from "@/server/services/cart";

export const metadata: Metadata = { title: "سبد خرید" };

export default async function CartPage() {
  const user = await requireUser("/cart");

  if (!canOrder(user)) {
    return (
      <DashboardShell user={user} title="سبد خرید" currentHref="/cart">
        <p className="text-lg">ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است.</p>
        <div className="mt-6">
          <ButtonLink href="/dashboard" variant="secondary">
            وضعیت تأیید حساب من
          </ButtonLink>
        </div>
      </DashboardShell>
    );
  }

  const { lines, totalToman } = await getCart(user.id);
  const hasAvailable = lines.some((l) => l.available);

  return (
    <DashboardShell user={user} title="سبد خرید" currentHref="/cart">
      {lines.length === 0 ? (
        <>
          <p className="text-lg text-muted">سبد خرید شما خالی است.</p>
          <div className="mt-6">
            <ButtonLink href="/shop" variant="secondary">
              رفتن به فروشگاه
            </ButtonLink>
          </div>
        </>
      ) : (
        <>
          <ul className="border-t border-line">
            {lines.map((line) => (
              <li key={line.productId} className="border-b border-line py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link href={`/shop/${line.slug}`} className="inline-flex min-h-11 items-center text-xl hover:underline">
                    {line.name}
                  </Link>
                  <span>{line.available ? formatToman(line.unitPriceToman * line.quantity) : "در دسترس نیست"}</span>
                </div>
                <ActionForm action={updateCartAction} className="mt-2">
                  <input type="hidden" name="productId" value={line.productId} />
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label htmlFor={`quantity-${line.productId}`} className="mb-1 block text-sm text-muted">
                        تعداد
                      </label>
                      <input
                        id={`quantity-${line.productId}`}
                        name="quantity"
                        type="number"
                        min={1}
                        max={MAX_QUANTITY}
                        defaultValue={line.quantity}
                        inputMode="numeric"
                        className="min-h-11 w-24 rounded-sm border border-muted bg-bg px-3 text-base"
                      />
                    </div>
                    <SubmitButton variant="secondary" pendingLabel="…">
                      به‌روزرسانی
                    </SubmitButton>
                    <SubmitButton variant="secondary" name="remove" value="1" pendingLabel="…">
                      حذف
                    </SubmitButton>
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-center justify-between text-xl">
            <span>جمع کل</span>
            <strong data-testid="cart-total">{formatToman(totalToman)}</strong>
          </p>
          <div className="mt-8">
            {hasAvailable ? <ButtonLink href="/checkout">ادامه و ثبت نشانی</ButtonLink> : null}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
