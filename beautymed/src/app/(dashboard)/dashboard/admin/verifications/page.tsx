import { DashboardShell, StatusBadge } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { formatJalaliDate, toPersianDigits } from "@/lib/format";
import { reviewVerificationAction, setLogoPermissionAction } from "@/server/actions/admin";
import { requireRole } from "@/server/auth/session";
import { listVerifications } from "@/server/services/verification";

type Doc = { id: string; originalName: string };

function Documents({ docs }: { docs: Doc[] }) {
  if (docs.length === 0) return <p className="text-muted">مدرکی بارگذاری نشده است.</p>;
  return (
    <ul>
      {docs.map((doc) => (
        <li key={doc.id}>
          <a href={`/api/documents/${doc.id}`} target="_blank" rel="noopener" className="link flex min-h-11 items-center">
            مشاهده‌ی مدرک: {doc.originalName}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ReviewForm({ kind, profileId }: { kind: "physician" | "importer"; profileId: string }) {
  const reasonId = `reason-${profileId}`;
  return (
    <ActionForm action={reviewVerificationAction} className="mt-4">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="profileId" value={profileId} />
      <label htmlFor={reasonId} className="mb-1.5 block text-base">
        دلیل رد (فقط برای رد کردن لازم است)
      </label>
      <textarea
        id={reasonId}
        name="reason"
        rows={2}
        maxLength={500}
        className="block w-full rounded-sm border border-muted bg-bg px-3 py-2 text-base"
      />
      <div className="mt-3 flex flex-wrap gap-3">
        <SubmitButton name="decision" value="approve">
          تأیید
        </SubmitButton>
        <SubmitButton name="decision" value="reject" variant="secondary">
          رد
        </SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function AdminVerificationsPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/verifications");
  const { physicians, importers } = await listVerifications();

  return (
    <DashboardShell user={user} title="تأیید حساب‌ها" currentHref="/dashboard/admin/verifications">
      <section aria-labelledby="physicians-title">
        <h2 id="physicians-title" className="text-2xl">
          پزشکان
        </h2>
        {physicians.length === 0 ? <p className="mt-4 text-muted">درخواستی ثبت نشده است.</p> : null}
        <ul className="mt-4 space-y-6">
          {physicians.map((p) => (
            <li key={p.id} className="border border-line p-6" data-testid={`physician-${p.user.mobile}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl">{p.fullName}</h3>
                <StatusBadge status={p.status} />
              </div>
              <dl className="mt-3 space-y-1 text-base">
                <div className="flex gap-2">
                  <dt className="text-muted">شماره‌ی نظام پزشکی:</dt>
                  <dd>{toPersianDigits(p.medicalCouncilNumber)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">موبایل:</dt>
                  <dd>{toPersianDigits(p.user.mobile)}</dd>
                </div>
                {p.clinicName ? (
                  <div className="flex gap-2">
                    <dt className="text-muted">کلینیک:</dt>
                    <dd>{p.clinicName}</dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="text-muted">تاریخ درخواست:</dt>
                  <dd>{formatJalaliDate(p.createdAt)}</dd>
                </div>
              </dl>
              <Documents docs={p.user.documents} />
              {p.status === "REJECTED" && p.rejectionReason ? <p className="mt-2">دلیل رد: {p.rejectionReason}</p> : null}
              {p.status === "PENDING" ? <ReviewForm kind="physician" profileId={p.id} /> : null}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="importers-title" className="mt-14">
        <h2 id="importers-title" className="text-2xl">
          شرکت‌های واردکننده
        </h2>
        {importers.length === 0 ? <p className="mt-4 text-muted">درخواستی ثبت نشده است.</p> : null}
        <ul className="mt-4 space-y-6">
          {importers.map((c) => (
            <li key={c.id} className="border border-line p-6" data-testid={`importer-${c.user.mobile}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl">{c.companyName}</h3>
                <StatusBadge status={c.status} />
              </div>
              <dl className="mt-3 space-y-1 text-base">
                <div className="flex gap-2">
                  <dt className="text-muted">شناسه‌ی ملی:</dt>
                  <dd>{toPersianDigits(c.nationalId)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">نماینده:</dt>
                  <dd>{c.contactName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-muted">موبایل:</dt>
                  <dd>{toPersianDigits(c.user.mobile)}</dd>
                </div>
              </dl>
              <Documents docs={c.user.documents} />
              {c.status === "REJECTED" && c.rejectionReason ? <p className="mt-2">دلیل رد: {c.rejectionReason}</p> : null}
              {c.status === "PENDING" ? <ReviewForm kind="importer" profileId={c.id} /> : null}
              {c.status === "APPROVED" ? (
                <ActionForm action={setLogoPermissionAction} className="mt-4">
                  <input type="hidden" name="profileId" value={c.id} />
                  <label htmlFor={`logo-${c.id}`} className="flex min-h-11 cursor-pointer items-start gap-3 py-2">
                    <input
                      id={`logo-${c.id}`}
                      name="allowed"
                      type="checkbox"
                      defaultChecked={c.logoPermission}
                      className="mt-1.5 size-5 shrink-0 accent-ink"
                    />
                    <span>این شرکت اجازه‌ی کتبی نمایش لوگو در سایت را داده است.</span>
                  </label>
                  <SubmitButton variant="secondary">ذخیره</SubmitButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
