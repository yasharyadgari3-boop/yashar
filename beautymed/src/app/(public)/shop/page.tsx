import type { Metadata } from "next";
import { HubLayout } from "@/components/hub/hub-layout";
import { ProductCard } from "@/components/shop/product-card";
import { getCurrentUser } from "@/server/auth/session";
import { canOrder, canSeePrices } from "@/server/rbac/permissions";
import { listCategories, listPublishedProducts } from "@/server/services/products";
import { getSetting } from "@/server/services/settings";

export const metadata: Metadata = { title: "فروشگاه" };

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ShopPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const [viewer, categories, visitorsSeePrices] = await Promise.all([getCurrentUser(), listCategories(), getSetting("visitorsSeePrices")]);
  const current = categories.find((c) => c.slug === category);
  const products = await listPublishedProducts({ categorySlug: current?.slug });
  const showPrice = canSeePrices(viewer, visitorsSeePrices);

  return (
    <HubLayout
      title="محصولات اصیل، فقط برای کادر درمان"
      lead={
        canOrder(viewer)
          ? "حساب شما تأیید شده است و می‌توانید سفارش ثبت کنید."
          : "اطلاعات محصولات برای همه قابل مشاهده است. ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است."
      }
      subnavLabel="دسته‌های فروشگاه"
      subnav={[{ href: "/shop", label: "همه‌ی دسته‌ها" }, ...categories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.title }))]}
      currentHref={current ? `/shop?category=${current.slug}` : "/shop"}
    >
      {products.length === 0 ? (
        <p className="text-lg text-muted">هنوز محصولی در این بخش منتشر نشده است.</p>
      ) : (
        <ul className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <li key={product.slug}>
              <ProductCard product={product} showPrice={showPrice} />
            </li>
          ))}
        </ul>
      )}
    </HubLayout>
  );
}
