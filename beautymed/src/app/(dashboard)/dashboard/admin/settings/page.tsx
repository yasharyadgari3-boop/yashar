import { DashboardShell, Panel } from "@/components/dashboard/dashboard-shell";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Checkbox } from "@/components/ui/field";
import { saveSettingsAction } from "@/server/actions/admin";
import { requireRole } from "@/server/auth/session";
import { getSetting } from "@/server/services/settings";

const fieldLabels: Record<string, string> = {
  ircCode: "کد ثبت سازمان غذا و دارو (IRC)",
  importerName: "نام واردکننده",
  authenticityDetails: "مشخصات اصالت",
};

export default async function AdminSettingsPage() {
  const user = await requireRole("ADMIN", "/dashboard/admin/settings");
  const [visitorsSeePrices, requiredFields] = await Promise.all([
    getSetting("visitorsSeePrices"),
    getSetting("complianceRequiredFields"),
  ]);

  return (
    <DashboardShell user={user} title="تنظیمات" currentHref="/dashboard/admin/settings">
      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="نمایش قیمت">
          <ActionForm action={saveSettingsAction}>
            <Checkbox
              name="visitorsSeePrices"
              defaultChecked={visitorsSeePrices}
              label="بازدیدکنندگان و حساب‌های تأییدنشده هم قیمت‌ها را ببینند."
            />
            <SubmitButton>ذخیره‌ی تنظیمات</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="قواعد انتشار محصول">
          <p className="text-muted">محصول تا وقتی این فیلدها پر نباشند منتشر نمی‌شود:</p>
          <ul className="list-inside list-disc">
            {requiredFields.map((field) => (
              <li key={field}>{fieldLabels[field] ?? field}</li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            این فهرست در پایگاه داده قابل تغییر است تا پس از تأیید الزامات حقوقی به‌روز شود.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
