import type { ReactNode } from "react";
import { HubLayout, type SubNavItem } from "@/components/hub/hub-layout";
import { toPersianDigits } from "@/lib/format";
import { logoutAction } from "@/server/actions/auth";
import type { CurrentUser } from "@/server/auth/session";

export const dashboardNav: Record<"ADMIN" | "PHYSICIAN" | "IMPORTER", ReadonlyArray<SubNavItem>> = {
  ADMIN: [
    { href: "/dashboard/admin", label: "نمای کلی" },
    { href: "/dashboard/admin/verifications", label: "تأیید حساب‌ها" },
    { href: "/dashboard/admin/products", label: "محصولات" },
    { href: "/dashboard/admin/orders", label: "سفارش‌ها" },
    { href: "/dashboard/admin/proposals", label: "پیشنهادهای همکاری" },
    { href: "/dashboard/admin/settings", label: "تنظیمات" },
  ],
  PHYSICIAN: [
    { href: "/dashboard/physician", label: "نمای کلی" },
    { href: "/orders", label: "سفارش‌های من" },
    { href: "/cart", label: "سبد خرید" },
  ],
  IMPORTER: [
    { href: "/dashboard/importer", label: "نمای کلی" },
    { href: "/dashboard/importer/products", label: "محصولات من" },
    { href: "/dashboard/importer/orders", label: "سفارش‌های محصولات من" },
    { href: "/dashboard/importer/proposals", label: "پیشنهاد همکاری" },
  ],
};

/** Shared frame for every role's panel: title, the role's own sub-navigation, sign-out. */
export function DashboardShell({
  user,
  title,
  currentHref,
  children,
}: {
  user: CurrentUser;
  title: string;
  currentHref: string;
  children: ReactNode;
}) {
  const nav = user.role ? dashboardNav[user.role] : [];
  return (
    <HubLayout
      title={title}
      lead={`${user.displayName ?? "حساب کاربری"} — ${toPersianDigits(user.mobile)}`}
      subnavLabel="بخش‌های پنل"
      subnav={nav}
      currentHref={currentHref}
    >
      {children}
      <form action={logoutAction} className="mt-16 border-t border-line pt-6">
        <button type="submit" className="link min-h-11 cursor-pointer text-base">
          خروج از حساب
        </button>
      </form>
    </HubLayout>
  );
}

const statusText = { PENDING: "در انتظار بررسی", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;

export function StatusBadge({ status }: { status: keyof typeof statusText }) {
  return <span className="inline-block rounded-sm border border-line bg-alt px-2.5 py-0.5 text-sm text-ink">{statusText[status]}</span>;
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border border-line p-6">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-4 space-y-3 text-base">{children}</div>
    </section>
  );
}
