import { DashboardShell, Panel, StatusBadge } from "@/components/dashboard/dashboard-shell";
import { ButtonLink } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";

export default async function ImporterDashboard() {
  const user = await requireRole("IMPORTER", "/dashboard/importer");
  const profile = await prisma.importerProfile.findUnique({
    where: { userId: user.id },
    select: { companyName: true, nationalId: true, contactName: true, status: true, rejectionReason: true },
  });

  return (
    <DashboardShell user={user} title="پنل شرکت واردکننده" currentHref="/dashboard/importer">
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="وضعیت تأیید شرکت">
          {profile ? (
            <>
              <p>
                <StatusBadge status={profile.status} />
              </p>
              {profile.status === "PENDING" ? (
                <p className="text-muted">مدارک شرکت دریافت شد. پس از بررسی مدیر سایت، امکان ثبت محصول باز می‌شود.</p>
              ) : null}
              {profile.status === "APPROVED" ? (
                <>
                  <p className="text-muted">شرکت شما تأیید شده است. هر محصول پس از تأیید مدیر سایت منتشر می‌شود.</p>
                  <ButtonLink href="/dashboard/importer/products">محصولات من</ButtonLink>
                </>
              ) : null}
              {profile.status === "REJECTED" ? (
                <>
                  <p>دلیل: {profile.rejectionReason ?? "ذکر نشده"}</p>
                  <ButtonLink href="/onboarding?type=importer">ارسال دوباره‌ی مدارک</ButtonLink>
                </>
              ) : null}
            </>
          ) : (
            <ButtonLink href="/onboarding?type=importer">تکمیل اطلاعات و ارسال مدرک</ButtonLink>
          )}
        </Panel>
        {profile ? (
          <Panel title="اطلاعات ثبت‌شده">
            <dl className="space-y-2">
              <div className="flex gap-2">
                <dt className="text-muted">شرکت:</dt>
                <dd>{profile.companyName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">شناسه‌ی ملی:</dt>
                <dd>{toPersianDigits(profile.nationalId)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">نماینده:</dt>
                <dd>{profile.contactName}</dd>
              </div>
            </dl>
          </Panel>
        ) : null}
      </div>
    </DashboardShell>
  );
}
