import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ProductStatusBadge } from "@/components/shop/product-card";
import { ButtonLink } from "@/components/ui/button";
import { formatToman } from "@/lib/format";
import { requireRole } from "@/server/auth/session";
import { canSubmitProducts } from "@/server/rbac/permissions";
import { listImporterProducts } from "@/server/services/products";

export const metadata: Metadata = { title: "محصولات من" };

export default async function ImporterProductsPage() {
  const user = await requireRole("IMPORTER", "/dashboard/importer/products");
  if (!canSubmitProducts(user) || !user.importerProfileId) notFound();
  const products = await listImporterProducts(user.importerProfileId);

  return (
    <DashboardShell user={user} title="محصولات من" currentHref="/dashboard/importer/products">
      <ButtonLink href="/dashboard/importer/products/new">ثبت محصول تازه</ButtonLink>
      <p className="mt-4 text-muted">هر محصول پس از بررسی و تأیید مدیر سایت در فروشگاه نمایش داده می‌شود.</p>
      {products.length === 0 ? (
        <p className="mt-8 text-lg text-muted">هنوز محصولی ثبت نکرده‌اید.</p>
      ) : (
        <ul className="mt-8 border-t border-line">
          {products.map((p) => (
            <li key={p.id} className="border-b border-line">
              <Link href={`/dashboard/importer/products/${p.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 hover:underline">
                <span>
                  <span className="text-lg">{p.name}</span>
                  <span className="ms-3 text-muted">{p.category.title}</span>
                </span>
                <span className="flex items-center gap-3">
                  <ProductStatusBadge status={p.status} />
                  <span>{formatToman(p.priceToman)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardShell>
  );
}
