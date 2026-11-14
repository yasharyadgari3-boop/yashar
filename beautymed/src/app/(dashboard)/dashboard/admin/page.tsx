import Link from "next/link";
import { DashboardShell, Panel } from "@/components/dashboard/dashboard-shell";
import { formatNumber } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { getAdminCounts } from "@/server/services/admin-overview";

export default async function AdminDashboard() {
  const user = await requireRole("ADMIN", "/dashboard/admin");
  const counts = await getAdminCounts();

  return (
    <DashboardShell user={user} title="پنل مدیر" currentHref="/dashboard/admin">
      <Panel title="کارهای در انتظار">
        <ul className="divide-y divide-line">
          {counts.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="flex min-h-12 items-center justify-between gap-4 hover:underline">
                <span>{item.label}</span>
                <span>{formatNumber(item.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </DashboardShell>
  );
}
