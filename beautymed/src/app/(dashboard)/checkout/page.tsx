import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, TextArea } from "@/components/ui/field";
import { formatToman } from "@/lib/format";
import { checkoutAction } from "@/server/actions/store";
import { isMockPayment } from "@/server/adapters/payment";
import { requireUser } from "@/server/auth/session";
import { canOrder } from "@/server/rbac/permissions";
import { getCart } from "@/server/services/cart";

export const metadata: Metadata = { title: "تسویه حساب" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  if (!canOrder(user)) redirect("/cart");
  const { lines, totalToman } = await getCart(user.id);
  if (!lines.some((l) => l.available)) redirect("/cart");

  return (
    <DashboardShell user={user} title="تسویه حساب" currentHref="/cart">
      <div className="grid gap-12 md:grid-cols-2">
        <ActionForm action={checkoutAction}>
          <h2 className="mb-5 text-2xl">نشانی ارسال</h2>
          <div className="space-y-5">
            <Field label="نام گیرنده" name="recipientName" required autoComplete="name" maxLength={100} defaultValue={user.displayName ?? ""} />
            <Field label="شماره‌ی موبایل گیرنده" name="phone" required type="tel" inputMode="tel" autoComplete="tel" dir="ltr" defaultValue={user.mobile} />
            <Field label="شهر" name="city" required autoComplete="address-level2" maxLength={60} />
            <TextArea label="نشانی کامل" name="address" required autoComplete="street-address" rows={3} maxLength={500} />
            <Field label="کد پستی (۱۰ رقم)" name="postalCode" required inputMode="numeric" autoComplete="postal-code" dir="ltr" maxLength={12} />
            <TextArea label="توضیح برای ارسال (اختیاری)" name="note" rows={2} maxLength={500} />
            <SubmitButton pendingLabel="در حال انتقال به درگاه…">ثبت سفارش و پرداخت</SubmitButton>
          </div>
        </ActionForm>

        <section aria-labelledby="summary-title" className="border border-line p-6">
          <h2 id="summary-title" className="text-2xl">
            خلاصه‌ی سفارش
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {lines
              .filter((l) => l.available)
              .map((l) => (
                <li key={l.productId} className="flex items-start justify-between gap-4 py-3">
                  <span>
                    {l.name} × {new Intl.NumberFormat("fa-IR").format(l.quantity)}
                  </span>
                  <span className="shrink-0">{formatToman(l.unitPriceToman * l.quantity)}</span>
                </li>
              ))}
          </ul>
          <p className="mt-4 flex items-center justify-between border-t border-gold pt-4 text-xl">
            <span>جمع کل</span>
            <strong>{formatToman(totalToman)}</strong>
          </p>
          {isMockPayment() ? (
            <p className="mt-4 border border-line bg-alt px-4 py-3 text-sm">
              حالت آزمایشی: درگاه پرداخت واقعی وصل نیست و هیچ پولی جابه‌جا نمی‌شود.
            </p>
          ) : null}
        </section>
      </div>
    </DashboardShell>
  );
}
