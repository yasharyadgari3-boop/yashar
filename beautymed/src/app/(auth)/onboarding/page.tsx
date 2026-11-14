import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Container } from "@/components/ui/layout";
import { submitImporterAction, submitPhysicianAction } from "@/server/actions/onboarding";
import { requireUser } from "@/server/auth/session";
import { dashboardPath } from "@/server/rbac/permissions";

export const metadata: Metadata = { title: "تکمیل حساب" };

type Props = { searchParams: Promise<{ type?: string }> };

const documentHint = "PDF یا JPG یا PNG، حداکثر ۵ مگابایت. این فایل خصوصی می‌ماند و فقط مدیر سایت آن را می‌بیند.";

export default async function OnboardingPage({ searchParams }: Props) {
  const user = await requireUser("/onboarding");
  if (user.role === "ADMIN") redirect(dashboardPath(user));

  const status = user.role === "PHYSICIAN" ? user.physicianStatus : user.role === "IMPORTER" ? user.importerStatus : null;
  // Once a request is pending or approved there is nothing to fill in.
  if (status === "PENDING" || status === "APPROVED") redirect(dashboardPath(user));

  const { type } = await searchParams;
  // After a rejection the account type is fixed; a new account may choose.
  const chosen = user.role === "PHYSICIAN" ? "physician" : user.role === "IMPORTER" ? "importer" : type;

  return (
    <SiteShell>
      <Container className="py-14 md:py-20">
        <div className="max-w-xl">
          <span aria-hidden="true" className="gold-rule mb-6" />
          {chosen === "physician" ? (
            <>
              <h1 className="text-4xl md:text-5xl">تأیید حساب پزشک</h1>
              <p className="mt-5 text-lg text-muted">
                اطلاعات زیر را وارد کنید. مدیر سایت آن را بررسی می‌کند و پس از تأیید، امکان سفارش و آموزش باز می‌شود.
              </p>
              <ActionForm action={submitPhysicianAction} className="mt-8">
                <div className="space-y-5">
                  <Field label="نام و نام خانوادگی" name="fullName" required autoComplete="name" maxLength={100} />
                  <Field label="شماره‌ی نظام پزشکی" name="medicalCouncilNumber" required inputMode="numeric" dir="ltr" maxLength={10} />
                  <Field label="نام کلینیک یا مطب (اختیاری)" name="clinicName" maxLength={100} />
                  <Field label="تصویر پروانه یا کارت نظام پزشکی" name="document" required type="file" accept=".pdf,.jpg,.jpeg,.png" hint={documentHint} />
                  <SubmitButton>ارسال برای بررسی</SubmitButton>
                </div>
              </ActionForm>
            </>
          ) : chosen === "importer" ? (
            <>
              <h1 className="text-4xl md:text-5xl">تأیید شرکت واردکننده</h1>
              <p className="mt-5 text-lg text-muted">
                اطلاعات شرکت را وارد کنید. پس از تأیید مدیر سایت می‌توانید محصول ثبت کنید. هیچ محصولی بدون تأیید مدیر
                منتشر نمی‌شود.
              </p>
              <ActionForm action={submitImporterAction} className="mt-8">
                <div className="space-y-5">
                  <Field label="نام شرکت" name="companyName" required autoComplete="organization" maxLength={120} />
                  <Field label="شناسه‌ی ملی شرکت (۱۱ رقم)" name="nationalId" required inputMode="numeric" dir="ltr" maxLength={11} />
                  <Field label="نام نماینده‌ی شرکت" name="contactName" required autoComplete="name" maxLength={100} />
                  <Field label="مدرک شرکت (مثل روزنامه‌ی رسمی یا مجوز واردات)" name="document" required type="file" accept=".pdf,.jpg,.jpeg,.png" hint={documentHint} />
                  <SubmitButton>ارسال برای بررسی</SubmitButton>
                </div>
              </ActionForm>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl">نوع حساب خود را انتخاب کنید</h1>
              <ul className="mt-8 border-t border-line">
                <li className="border-b border-line">
                  <Link href="/onboarding?type=physician" className="flex min-h-16 flex-col justify-center py-3 hover:underline">
                    <span className="text-xl">پزشک یا کلینیک</span>
                    <span className="text-muted">برای سفارش محصول و دسترسی به آموزش‌ها</span>
                  </Link>
                </li>
                <li className="border-b border-line">
                  <Link href="/onboarding?type=importer" className="flex min-h-16 flex-col justify-center py-3 hover:underline">
                    <span className="text-xl">شرکت واردکننده</span>
                    <span className="text-muted">برای ثبت محصول و پیشنهاد همکاری</span>
                  </Link>
                </li>
              </ul>
            </>
          )}
        </div>
      </Container>
    </SiteShell>
  );
}
