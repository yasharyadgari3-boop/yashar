import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Container } from "@/components/ui/layout";
import { toPersianDigits } from "@/lib/format";
import { getPendingMobile, verifyOtpAction } from "@/server/actions/auth";
import { isMockSms } from "@/server/adapters/sms";
import { peekMockOtp } from "@/server/adapters/sms/mock";

export const metadata: Metadata = { title: "تأیید کد ورود" };

export default async function VerifyPage() {
  const mobile = await getPendingMobile();
  if (!mobile) redirect("/login");
  // Shown only with the mock SMS provider (development and tests), never with a real one.
  const devCode = isMockSms() ? peekMockOtp(mobile) : undefined;

  return (
    <SiteShell>
      <Container className="py-14 md:py-20">
        <div className="max-w-md">
          <span aria-hidden="true" className="gold-rule mb-6" />
          <h1 className="text-4xl md:text-5xl">کد ورود</h1>
          <p className="mt-5 text-lg text-muted">
            کد ۶ رقمی فرستاده‌شده به شماره‌ی {toPersianDigits(mobile)} را وارد کنید. کد تا ۲ دقیقه معتبر است.
          </p>
          {devCode ? (
            <p className="mt-6 border border-line bg-alt px-4 py-3 text-base">
              حالت آزمایشی (پیامک واقعی فرستاده نمی‌شود). کد شما:{" "}
              <strong data-testid="dev-otp" className="latin">
                {devCode}
              </strong>
            </p>
          ) : null}
          <ActionForm action={verifyOtpAction} className="mt-8">
            <div className="space-y-5">
              <Field
                label="کد ۶ رقمی"
                name="code"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
              />
              <SubmitButton pendingLabel="در حال بررسی…">ورود</SubmitButton>
            </div>
          </ActionForm>
          <p className="mt-8">
            <Link href="/login" className="link inline-flex min-h-11 items-center">
              تغییر شماره یا درخواست کد تازه
            </Link>
          </p>
        </div>
      </Container>
    </SiteShell>
  );
}
