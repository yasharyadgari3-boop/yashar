import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, TextArea } from "@/components/ui/field";
import { formatJalaliDate } from "@/lib/format";
import { submitProposalAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { canSubmitProducts } from "@/server/rbac/permissions";
import { listProposalsForImporter } from "@/server/services/proposals";

export const metadata: Metadata = { title: "پیشنهاد همکاری" };

export default async function ImporterProposalsPage() {
  const user = await requireRole("IMPORTER", "/dashboard/importer/proposals");
  if (!canSubmitProducts(user) || !user.importerProfileId) notFound();
  const proposals = await listProposalsForImporter(user.importerProfileId);

  return (
    <DashboardShell user={user} title="پیشنهاد همکاری" currentHref="/dashboard/importer/proposals">
      <ActionForm action={submitProposalAction} className="max-w-2xl">
        <div className="space-y-5">
          <Field label="موضوع" name="subject" required maxLength={150} />
          <TextArea label="متن پیشنهاد" name="message" required rows={5} maxLength={3000} />
          <SubmitButton>ارسال پیشنهاد</SubmitButton>
        </div>
      </ActionForm>

      <section aria-labelledby="sent-title" className="mt-14">
        <h2 id="sent-title" className="text-2xl">
          پیشنهادهای فرستاده‌شده
        </h2>
        {proposals.length === 0 ? <p className="mt-3 text-muted">هنوز پیشنهادی نفرستاده‌اید.</p> : null}
        <ul className="mt-4 border-t border-line">
          {proposals.map((p) => (
            <li key={p.id} className="border-b border-line py-4">
              <p className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-lg">{p.subject}</span>
                <span className="text-sm text-muted">
                  {formatJalaliDate(p.createdAt)} — {p.status === "NEW" ? "در انتظار بررسی" : "بررسی‌شده"}
                </span>
              </p>
              <p className="mt-2 whitespace-pre-line text-muted">{p.message}</p>
            </li>
          ))}
        </ul>
      </section>
    </DashboardShell>
  );
}
