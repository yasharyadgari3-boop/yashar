import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/layout/site-shell";

export const metadata: Metadata = { title: "پنل کاربری" };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
