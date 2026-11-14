import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/layout/site-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Container } from "@/components/ui/layout";
import { requestOtpAction } from "@/server/actions/auth";
import { getCurrentUser } from "@/server/auth/session";
import { dashboardPath } from "@/server/rbac/permissions";
import { safeNextPath } from "@/server/security";

export const metadata: Metadata = { title: "ورود" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(safeNextPath(next, dashboardPath(user)));

  return (
    <SiteShell>
      <Container className="py-14 md:py-20">
        <div className="max-w-md">
          <span aria-hidden="true" className="gold-rule mb-6" />
          <h1 className="text-4xl md:text-5xl">ورود</h1>
          <p className="mt-5 text-lg text-muted">
            شماره‌ی موبایل خود را وارد کنید تا کد ورود برایتان پیامک شود. پزشکان و شرکت‌های واردکننده از همین‌جا وارد
            می‌شوند.
          </p>
          <ActionForm action={requestOtpAction} className="mt-8">
            <input type="hidden" name="next" value={safeNextPath(next, "")} />
            <div className="space-y-5">
              <Field
                label="شماره‌ی موبایل"
                name="mobile"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                hint="نمونه: ۰۹۱۲۱۲۳۴۵۶۷"
              />
              <SubmitButton>دریافت کد ورود</SubmitButton>
            </div>
          </ActionForm>
        </div>
      </Container>
    </SiteShell>
  );
}
