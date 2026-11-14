import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { dashboardPath } from "@/server/rbac/permissions";

/** Sends each signed-in person to their own role's panel. */
export default async function DashboardIndex() {
  const user = await requireUser("/dashboard");
  redirect(dashboardPath(user));
}
