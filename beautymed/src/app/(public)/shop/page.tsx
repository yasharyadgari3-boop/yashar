import type { Metadata } from "next";
import { HubLayout } from "@/components/hub/hub-layout";
import { ImageSlot } from "@/components/ui/image-slot";
import { SampleNotice } from "@/components/ui/sample-notice";
import { productCategories } from "@/content/site";

export const metadata: Metadata = { title: "فروشگاه" };

type Props = { searchParams: Promise<{ category?: string }> };

/** Phase 1 storefront: categories only. The catalog, cart and orders arrive in Phase 3. */
export default async function ShopPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const current = productCategories.find((c) => c.slug === category);
  const visible = current ? [current] : productCategories;

  return (
    <HubLayout
      title="محصولات اصیل، فقط برای کادر درمان"
      lead="ثبت سفارش فقط با حساب پزشک تأییدشده ممکن است."
      subnavLabel="دسته‌های فروشگاه"
      subnav={[
        { href: "/shop", label: "همه‌ی دسته‌ها" },
        ...productCategories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.title })),
      ]}
      currentHref={current ? `/shop?category=${current.slug}` : "/shop"}
    >
      <SampleNotice text="محصولات پس از ثبت توسط واردکننده و تأیید مدیر در این بخش نمایش داده می‌شوند." />
      <ul className="mt-10 grid gap-8 md:grid-cols-2">
        {visible.map((c) => (
          <li key={c.slug}>
            <ImageSlot brief={c.image} sizes="(min-width: 48rem) 50vw, 100vw" />
            <h2 className="mt-4 text-xl">{c.title}</h2>
          </li>
        ))}
      </ul>
    </HubLayout>
  );
}
