import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { formatJalaliDate } from "@/lib/format";
import { markProposalReviewedAction } from "@/server/actions/store";
import { requireRole } from "@/server/auth/session";
import { listAllProposals } from "@/server/services/proposals";

export const metadata: Metadata = { title: "پیشنهادهای همکاری" };

export default async function AdminProposalsPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/proposals");
  const proposals = await listAllProposals();

  return (
    <DashboardShell user={user} title="پیشنهادهای همکاری" currentHref="/dashboard/admin/proposals">
      {proposals.length === 0 ? <p className="text-lg text-muted">پیشنهادی ثبت نشده است.</p> : null}
      <ul className="space-y-6">
        {proposals.map((p) => (
          <li key={p.id} className="border border-line p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl">{p.subject}</h2>
              <span className="text-sm text-muted">
                {p.importer.companyName} — {formatJalaliDate(p.createdAt)} — {p.status === "NEW" ? "تازه" : "بررسی‌شده"}
              </span>
            </div>
            {/* Importer text is shown as plain text only. */}
            <p className="mt-3 whitespace-pre-line">{p.message}</p>
            {p.status === "NEW" ? (
              <ActionForm action={markProposalReviewedAction} className="mt-4">
                <input type="hidden" name="proposalId" value={p.id} />
                <SubmitButton variant="secondary">ثبت به‌عنوان بررسی‌شده</SubmitButton>
              </ActionForm>
            ) : null}
          </li>
        ))}
      </ul>
    </DashboardShell>
  );
}
