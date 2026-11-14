import { DashboardShell, Panel, StatusBadge } from "@/components/dashboard/dashboard-shell";
import { ButtonLink } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { prisma } from "@/server/db";

export default async function PhysicianDashboard() {
  const user = await requireRole("PHYSICIAN", "/dashboard/physician");
  const profile = await prisma.physicianProfile.findUnique({
    where: { userId: user.id },
    select: { fullName: true, medicalCouncilNumber: true, clinicName: true, status: true, rejectionReason: true },
  });

  return (
    <DashboardShell user={user} title="پنل پزشک" currentHref="/dashboard/physician">
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="وضعیت تأیید حساب">
          {profile ? (
            <>
              <p>
                <StatusBadge status={profile.status} />
              </p>
              {profile.status === "PENDING" ? (
                <p className="text-muted">مدارک شما دریافت شد. پس از بررسی مدیر سایت، امکان سفارش و دسترسی به آموزش‌ها باز می‌شود.</p>
              ) : null}
              {profile.status === "APPROVED" ? (
                <>
                  <p className="text-muted">حساب شما تأیید شده است. می‌توانید سفارش ثبت کنید.</p>
                  <ButtonLink href="/shop">رفتن به فروشگاه</ButtonLink>
                </>
              ) : null}
              {profile.status === "REJECTED" ? (
                <>
                  <p>دلیل: {profile.rejectionReason ?? "ذکر نشده"}</p>
                  <ButtonLink href="/onboarding?type=physician">ارسال دوباره‌ی مدارک</ButtonLink>
                </>
              ) : null}
            </>
          ) : (
            <ButtonLink href="/onboarding?type=physician">تکمیل اطلاعات و ارسال مدرک</ButtonLink>
          )}
        </Panel>
        {profile ? (
          <Panel title="اطلاعات ثبت‌شده">
            <dl className="space-y-2">
              <div className="flex gap-2">
                <dt className="text-muted">نام:</dt>
                <dd>{profile.fullName}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted">شماره‌ی نظام پزشکی:</dt>
                <dd>{toPersianDigits(profile.medicalCouncilNumber)}</dd>
              </div>
              {profile.clinicName ? (
                <div className="flex gap-2">
                  <dt className="text-muted">کلینیک:</dt>
                  <dd>{profile.clinicName}</dd>
                </div>
              ) : null}
            </dl>
          </Panel>
        ) : null}
      </div>
    </DashboardShell>
  );
}
