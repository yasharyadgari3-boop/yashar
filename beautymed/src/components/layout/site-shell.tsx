import type { ReactNode } from "react";
import { getCurrentUser } from "@/server/auth/session";
import { dashboardPath } from "@/server/rbac/permissions";
import { Footer } from "./footer";
import { Header, type HeaderAccount } from "./header";

/** Page frame: header (with "sign in" or "my panel"), main content, footer. */
export async function SiteShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const account: HeaderAccount = user ? { href: dashboardPath(user), label: "پنل من" } : { href: "/login", label: "ورود" };
  return (
    <>
      <Header account={account} />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
