import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { formatToman } from "@/lib/format";
import { isMockPayment } from "@/server/adapters/payment";
import { prisma } from "@/server/db";

export const metadata: Metadata = { title: "درگاه پرداخت آزمایشی" };

type Props = { params: Promise<{ authority: string }> };

/**
 * Stand-in for the real gateway's payment page. It exists only while the mock gateway is
 * active; with a real gateway (or in production without the explicit test flag) it is a 404.
 */
export default async function MockGatewayPage({ params }: Props) {
  if (!isMockPayment()) notFound();
  const { authority } = await params;
  const payment = await prisma.payment.findUnique({
    where: { authority },
    select: { amountToman: true, status: true, order: { select: { number: true } } },
  });
  if (!payment || payment.status !== "INITIATED") notFound();
  const callback = `/api/v1/payments/callback?authority=${encodeURIComponent(authority)}`;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-14">
      <span aria-hidden="true" className="gold-rule mb-6" />
      <h1 className="text-3xl">درگاه پرداخت آزمایشی</h1>
      <p className="mt-4 border border-line bg-alt px-4 py-3">
        این صفحه جایگزین درگاه واقعی است. هیچ پولی جابه‌جا نمی‌شود و اطلاعات کارت خواسته نمی‌شود.
      </p>
      <dl className="mt-6 space-y-2 text-lg">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">شماره‌ی سفارش</dt>
          <dd className="latin">{payment.order.number}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">مبلغ</dt>
          <dd>{formatToman(payment.amountToman)}</dd>
        </div>
      </dl>
      <div className="mt-8 flex flex-wrap gap-4">
        <a href={`${callback}&status=OK`} className={buttonClass("primary")}>
          پرداخت موفق (آزمایشی)
        </a>
        <a href={`${callback}&status=NOK`} className={buttonClass("secondary")}>
          انصراف از پرداخت
        </a>
      </div>
    </main>
  );
}
